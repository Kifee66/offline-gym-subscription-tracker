import Dexie, { Table } from 'dexie';

// Database Models
export interface Member {
  id?: number;
  fullName: string;
  phone: string;
  email?: string;
  gender: 'male' | 'female' | 'other';
  startDate: Date;
  subscriptionType: 'daily' | 'weekly' | 'monthly';
  subscriptionFee: number;
  renewalDate: Date;
  status: 'active' | 'due' | 'overdue';
  paymentStatus: 'paid' | 'incomplete';
  lastCheckIn?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id?: number;
  memberId: number;
  amount: number;
  paymentMethod: 'cash' | 'mpesa' | 'card' | 'bank-transfer';
  paymentDate: Date;
  renewalPeriod: string; // e.g., "Jan 2024", "Q1 2024"
  subscriptionType: 'daily' | 'weekly' | 'monthly';
  notes?: string;
  createdAt: Date;
}

export interface CheckIn {
  id?: number;
  memberId: number;
  checkInDate: Date;
  createdAt: Date;
}

export interface GymSettings {
  id?: number;
  gymName: string;
  gymLogo?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  defaultDailyFee: number;
  defaultWeeklyFee: number;
  defaultMonthlyFee: number;
  pinCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Database Class
export class GymFlowDatabase extends Dexie {
  members!: Table<Member>;
  payments!: Table<Payment>;
  checkIns!: Table<CheckIn>;
  settings!: Table<GymSettings>;

  constructor() {
    super('GymFlowDB');
    
    this.version(2).stores({
      members: '++id, fullName, phone, email, status, paymentStatus, subscriptionType, renewalDate, lastCheckIn, createdAt',
      payments: '++id, memberId, paymentDate, amount, paymentMethod, subscriptionType, createdAt',
      checkIns: '++id, memberId, checkInDate, createdAt',
      settings: '++id, gymName, createdAt'
    });

    // Hooks for automatic timestamps and status updates
    this.members.hook('creating', (primKey, obj, trans) => {
      const member = obj as Member;
      member.createdAt = new Date();
      member.updatedAt = new Date();
      member.status = this.calculateMemberStatus(member.renewalDate);
    });

    this.members.hook('updating', (modifications, primKey, obj, trans) => {
      const mods = modifications as Partial<Member>;
      mods.updatedAt = new Date();
      if (mods.renewalDate) {
        mods.status = this.calculateMemberStatus(mods.renewalDate);
      }
    });

    this.payments.hook('creating', (primKey, obj, trans) => {
      const payment = obj as Payment;
      payment.createdAt = new Date();
    });

    this.checkIns.hook('creating', (primKey, obj, trans) => {
      const checkIn = obj as CheckIn;
      checkIn.createdAt = new Date();
    });

    this.settings.hook('creating', (primKey, obj, trans) => {
      const settings = obj as GymSettings;
      settings.createdAt = new Date();
      settings.updatedAt = new Date();
    });

    this.settings.hook('updating', (modifications, primKey, obj, trans) => {
      const mods = modifications as Partial<GymSettings>;
      mods.updatedAt = new Date();
    });
  }

  // Helper Methods
  private calculateMemberStatus(renewalDate: Date): 'active' | 'due' | 'overdue' {
    const now = new Date();
    const timeDiff = renewalDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff < -7) {
      return 'overdue';
    } else if (daysDiff <= 0) {
      return 'due';
    } else {
      return 'active';
    }
  }

  // Calculate renewal date based on subscription type
  calculateRenewalDate(startDate: Date, subscriptionType: Member['subscriptionType']): Date {
    const renewalDate = new Date(startDate);
    
    switch (subscriptionType) {
      case 'daily':
        renewalDate.setDate(renewalDate.getDate() + 1);
        break;
      case 'weekly':
        renewalDate.setDate(renewalDate.getDate() + 7);
        break;
      case 'monthly':
        renewalDate.setMonth(renewalDate.getMonth() + 1);
        break;
    }
    
    return renewalDate;
  }

  // Database Operations
  async getAllMembers(): Promise<Member[]> {
    return this.members.orderBy('fullName').toArray();
  }

  async getMembersByStatus(status: Member['status']): Promise<Member[]> {
    return this.members.where('status').equals(status).toArray();
  }

  async getActiveMembers(): Promise<Member[]> {
    return this.members.where('status').equals('active').toArray();
  }

  async getDueMembers(): Promise<Member[]> {
    return this.members.where('status').equals('due').toArray();
  }

  async getOverdueMembers(): Promise<Member[]> {
    return this.members.where('status').equals('overdue').toArray();
  }

  async getMembersWithIncompletePayments(): Promise<Member[]> {
    return this.members.where('paymentStatus').equals('incomplete').toArray();
  }

  async getMemberPayments(memberId: number): Promise<Payment[]> {
    return this.payments.where('memberId').equals(memberId).reverse().toArray();
  }

  async getMonthlyRevenue(year: number, month: number): Promise<number> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const payments = await this.payments
      .where('paymentDate')
      .between(startDate, endDate)
      .toArray();
    
    return payments.reduce((total, payment) => total + payment.amount, 0);
  }

  async getGymSettings(): Promise<GymSettings | undefined> {
    return this.settings.orderBy('id').last();
  }

  async updateMemberStatuses(): Promise<void> {
    const members = await this.getAllMembers();
    
    for (const member of members) {
      const newStatus = this.calculateMemberStatus(member.renewalDate);
      if (member.status !== newStatus) {
        await this.members.update(member.id!, { status: newStatus });
      }
    }
  }

  // Search functionality
  async searchMembers(query: string): Promise<Member[]> {
    const searchTerm = query.toLowerCase();
    return this.members
      .filter(member => 
        member.fullName.toLowerCase().includes(searchTerm) ||
        member.phone.includes(searchTerm) ||
        (member.email && member.email.toLowerCase().includes(searchTerm))
      )
      .toArray();
  }

  // Check-in methods
  async checkInMember(memberId: number): Promise<void> {
    const member = await this.members.get(memberId);
    if (!member) throw new Error('Member not found');
    
    if (member.status === 'overdue' || member.paymentStatus === 'incomplete') {
      throw new Error('Cannot check in: Member has overdue subscription or incomplete payment');
    }

    // Record check-in
    await this.checkIns.add({
      memberId,
      checkInDate: new Date(),
      createdAt: new Date()
    });

    // Update last check-in time
    await this.members.update(memberId, { lastCheckIn: new Date() });
  }

  async getRecentCheckIns(limit: number = 5): Promise<Array<CheckIn & { memberName: string }>> {
    const checkIns = await this.checkIns.orderBy('checkInDate').reverse().limit(limit).toArray();
    const checkInsWithNames = await Promise.all(
      checkIns.map(async (checkIn) => {
        const member = await this.members.get(checkIn.memberId);
        return {
          ...checkIn,
          memberName: member?.fullName || 'Unknown Member'
        };
      })
    );
    return checkInsWithNames;
  }

  async getTodayCheckIns(): Promise<number> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const todayCheckIns = await this.checkIns
      .where('checkInDate')
      .between(startOfDay, endOfDay)
      .count();
    
    return todayCheckIns;
  }

  async getWeeklyCheckInStats(): Promise<Array<{ day: string; checkIns: number }>> {
    const weeklyStats = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
      
      const checkIns = await this.checkIns
        .where('checkInDate')
        .between(startOfDay, endOfDay)
        .count();
      
      weeklyStats.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        checkIns
      });
    }
    
    return weeklyStats;
  }

  async getTodayRevenue(): Promise<{ daily: number; weekly: number; monthly: number; incomplete: number }> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const todayPayments = await this.payments
      .where('paymentDate')
      .between(startOfDay, endOfDay)
      .toArray();
    
    const revenue = {
      daily: 0,
      weekly: 0,
      monthly: 0,
      incomplete: 0
    };
    
    todayPayments.forEach(payment => {
      revenue[payment.subscriptionType] += payment.amount;
    });
    
    // Calculate incomplete payments (members with incomplete payment status)
    const incompleteMembers = await this.getMembersWithIncompletePayments();
    revenue.incomplete = incompleteMembers.reduce((sum, member) => sum + member.subscriptionFee, 0);
    
    return revenue;
  }
}

// Database instance
export const db = new GymFlowDatabase();

// Initialize default settings
export const initializeDefaultSettings = async () => {
  const existingSettings = await db.getGymSettings();
  
  if (!existingSettings) {
    await db.settings.add({
      gymName: 'My Gym',
      defaultDailyFee: 100,
      defaultWeeklyFee: 500,
      defaultMonthlyFee: 2000,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
};