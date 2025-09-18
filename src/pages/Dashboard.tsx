import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  DollarSign, 
  TrendingUp,
  Calendar,
  Plus,
  Dumbbell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatsCard from '@/components/dashboard/StatsCard';
import { db, Member, initializeDefaultSettings } from '@/lib/database';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  expiredMembers: number;
  expiringSoon: number;
  monthlyRevenue: number;
  upcomingRenewals: Member[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    expiredMembers: 0,
    expiringSoon: 0,
    monthlyRevenue: 0,
    upcomingRenewals: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Initialize default settings if needed
        await initializeDefaultSettings();
        
        // Update member statuses first
        await db.updateMemberStatuses();
        
        // Get all members
        const allMembers = await db.getAllMembers();
        const activeMembers = await db.getActiveMembers();
        const expiredMembers = await db.getExpiredMembers();
        const expiringSoonMembers = await db.getExpiringSoonMembers();
        
        // Get current month revenue
        const now = new Date();
        const monthlyRevenue = await db.getMonthlyRevenue(now.getFullYear(), now.getMonth() + 1);
        
        // Get upcoming renewals (next 7 days)
        const upcomingRenewals = expiringSoonMembers.slice(0, 5);
        
        setStats({
          totalMembers: allMembers.length,
          activeMembers: activeMembers.length,
          expiredMembers: expiredMembers.length,
          expiringSoon: expiringSoonMembers.length,
          monthlyRevenue,
          upcomingRenewals
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's your gym overview.</p>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your gym overview for {format(new Date(), 'MMMM yyyy')}.
          </p>
        </div>
        <Link to="/members/add">
          <Button className="btn-gym-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </Link>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <StatsCard
          title="Total Members"
          value={stats.totalMembers}
          icon={Users}
          variant="primary"
        />
        <StatsCard
          title="Active Members"
          value={stats.activeMembers}
          icon={UserCheck}
          variant="success"
        />
        <StatsCard
          title="Expired Members"
          value={stats.expiredMembers}
          icon={UserX}
          variant="destructive"
        />
        <StatsCard
          title="Expiring Soon"
          value={stats.expiringSoon}
          icon={Clock}
          variant="warning"
        />
      </motion.div>

      {/* Revenue and Renewals */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Revenue */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="card-stats revenue-card-gradient border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">
                Monthly Revenue
              </CardTitle>
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                KSh {stats.monthlyRevenue.toLocaleString()}
              </div>
              <div className="flex items-center pt-2">
                <TrendingUp className="w-4 h-4 text-white/80 mr-1" />
                <span className="text-xs font-medium text-white/80">
                  {format(new Date(), 'MMMM yyyy')}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Renewals */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="card-stats">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Upcoming Renewals
              </CardTitle>
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Calendar className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.upcomingRenewals.length > 0 ? (
                  stats.upcomingRenewals.map((member) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {member.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(member.renewalDate, 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <span className="text-xs font-medium member-expiring-soon">
                        {member.status === 'expiring-soon' ? 'Due Soon' : 'Expired'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming renewals
                  </p>
                )}
              </div>
              {stats.upcomingRenewals.length > 0 && (
                <Link to="/members?filter=expiring-soon" className="block mt-4">
                  <Button variant="outline" size="sm" className="w-full">
                    View All Renewals
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* PWA Install Prompt */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="lg:hidden"
      >
        <Card className="card-stats">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary to-primary-glow rounded-lg">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">GymFlow</h2>
                <p className="text-sm text-muted-foreground">Install as app</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Install
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid gap-4 md:grid-cols-3"
      >
        <Link to="/members/add">
          <Card className="card-stats hover:scale-105 transition-all duration-200 cursor-pointer">
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-lg bg-primary/10 text-primary mr-4">
                <Plus className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Add New Member</h3>
                <p className="text-sm text-muted-foreground">Register a new gym member</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/payments">
          <Card className="card-stats hover:scale-105 transition-all duration-200 cursor-pointer">
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-lg bg-accent/10 text-accent mr-4">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Record Payment</h3>
                <p className="text-sm text-muted-foreground">Add member payment</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/reports">
          <Card className="card-stats hover:scale-105 transition-all duration-200 cursor-pointer">
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-lg bg-success/10 text-success mr-4">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">View Reports</h3>
                <p className="text-sm text-muted-foreground">Analyze gym performance</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    </div>
  );
}