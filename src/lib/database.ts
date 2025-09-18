import Dexie, { Table } from 'dexie';

// Database Models
export interface Member {
  id?: number;
  fullName: string;
  phone: string;
  email?: string;
  gender: 'male' | 'female' | 'other';
  startDate: Date;
  subscriptionType: 'monthly' | 'quarterly' | 'annual';
  subscriptionFee: number;
  renewalDate: Date;
  status: 'active' | 'expired' | 'expiring-soon';
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
  notes?: string;
  createdAt: Date;
}

export interface GymSettings {
  id?: number;
  gymName: string;
  gymLogo?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  defaultMonthlyFee: number;
  defaultQuarterlyFee: number;
  defaultAnnualFee: number;
  pinCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Database Class
export class GymFlowDatabase extends Dexie {
  members!: Table<Member>;
  payments!: Table<Payment>;
  settings!: Table<GymSettings>;

  constructor() {
    super('GymFlowDB');
    
    this.version(1).stores({
      members: '++id, fullName, phone, email, status, subscriptionType, renewalDate, createdAt',
      payments: '++id, memberId, paymentDate, amount, paymentMethod, createdAt',
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
  private calculateMemberStatus(renewalDate: Date): 'active' | 'expired' | 'expiring-soon' {
    const now = new Date();
    const timeDiff = renewalDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff < 0) {
      return 'expired';
    } else if (daysDiff <= 7) {
      return 'expiring-soon';
    } else {
      return 'active';
    }
  }

  // Calculate renewal date based on subscription type
  calculateRenewalDate(startDate: Date, subscriptionType: Member['subscriptionType']): Date {
    const renewalDate = new Date(startDate);
    
    switch (subscriptionType) {
      case 'monthly':
        renewalDate.setMonth(renewalDate.getMonth() + 1);
        break;
      case 'quarterly':
        renewalDate.setMonth(renewalDate.getMonth() + 3);
        break;
      case 'annual':
        renewalDate.setFullYear(renewalDate.getFullYear() + 1);
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

  async getExpiredMembers(): Promise<Member[]> {
    return this.members.where('status').equals('expired').toArray();
  }

  async getExpiringSoonMembers(): Promise<Member[]> {
    return this.members.where('status').equals('expiring-soon').toArray();
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
}

// Database instance
export const db = new GymFlowDatabase();

// Initialize default settings
export const initializeDefaultSettings = async () => {
  const existingSettings = await db.getGymSettings();
  
  if (!existingSettings) {
    await db.settings.add({
      gymName: 'My Gym',
      defaultMonthlyFee: 2000,
      defaultQuarterlyFee: 5500,
      defaultAnnualFee: 20000,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
};