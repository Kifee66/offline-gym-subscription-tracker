import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  UserCheck, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Plus,
  Dumbbell,
  Activity,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import StatsCard from '@/components/dashboard/StatsCard';
import { db, Member, initializeDefaultSettings } from '@/lib/database';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  todayCheckIns: number;
  todayRevenue: {
    daily: number;
    weekly: number;
    monthly: number;
    incomplete: number;
  };
  incompletePayments: number;
  overdueMembers: Member[];
  weeklyCheckIns: Array<{ day: string; checkIns: number }>;
  subscriptionTypeBreakdown: Array<{ name: string; value: number }>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    todayCheckIns: 0,
    todayRevenue: { daily: 0, weekly: 0, monthly: 0, incomplete: 0 },
    incompletePayments: 0,
    overdueMembers: [],
    weeklyCheckIns: [],
    subscriptionTypeBreakdown: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Initialize default settings if needed
        await initializeDefaultSettings();
        
        // Update member statuses first
        await db.updateMemberStatuses();
        
        // Get all members and stats
        const allMembers = await db.getAllMembers();
        const activeMembers = await db.getActiveMembers();
        const overdueMembers = await db.getOverdueMembers();
        const incompleteMembers = await db.getMembersWithIncompletePayments();
        
        // Get today's data
        const todayCheckIns = await db.getTodayCheckIns();
        const todayRevenue = await db.getTodayRevenue();
        const weeklyCheckIns = await db.getWeeklyCheckInStats();
        
        // Subscription type breakdown
        const subscriptionStats = allMembers.reduce((acc, member) => {
          acc[member.subscriptionType] = (acc[member.subscriptionType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const subscriptionTypeBreakdown = [
          { name: 'Daily', value: subscriptionStats.daily || 0 },
          { name: 'Weekly', value: subscriptionStats.weekly || 0 },
          { name: 'Monthly', value: subscriptionStats.monthly || 0 }
        ];
        
        setStats({
          totalMembers: allMembers.length,
          activeMembers: activeMembers.length,
          todayCheckIns,
          todayRevenue,
          incompletePayments: incompleteMembers.length,
          overdueMembers: overdueMembers.slice(0, 5),
          weeklyCheckIns,
          subscriptionTypeBreakdown
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
          title="Active Members"
          value={stats.activeMembers}
          icon={UserCheck}
          variant="success"
        />
        <StatsCard
          title="Today's Check-ins"
          value={stats.todayCheckIns}
          icon={Activity}
          variant="primary"
        />
        <StatsCard
          title="Today's Revenue"
          value={`KSh ${(stats.todayRevenue.daily + stats.todayRevenue.weekly + stats.todayRevenue.monthly).toLocaleString()}`}
          icon={DollarSign}
          variant="primary"
        />
        <StatsCard
          title="Incomplete Payments"
          value={stats.incompletePayments}
          icon={CreditCard}
          variant="warning"
        />
      </motion.div>

      {/* Charts and Visualizations */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Weekly Check-ins Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="card-stats">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Weekly Check-ins</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.weeklyCheckIns}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="checkIns" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Subscription Type Pie Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="card-stats">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Subscription Types</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stats.subscriptionTypeBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {stats.subscriptionTypeBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${index + 1}))`} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Revenue Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="card-stats">
          <CardHeader>
            <CardTitle>Today's Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Daily</p>
                <p className="text-xl font-bold text-foreground">KSh {stats.todayRevenue.daily.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Weekly</p>
                <p className="text-xl font-bold text-foreground">KSh {stats.todayRevenue.weekly.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Monthly</p>
                <p className="text-xl font-bold text-foreground">KSh {stats.todayRevenue.monthly.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-destructive/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Incomplete</p>
                <p className="text-xl font-bold text-destructive">KSh {stats.todayRevenue.incomplete.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Alerts Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="card-stats">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-warning" />
              Alerts & Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.overdueMembers.length > 0 && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <h4 className="font-medium text-destructive mb-2">Overdue Members</h4>
                  <div className="space-y-1">
                    {stats.overdueMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between text-sm">
                        <span>{member.fullName}</span>
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                          Overdue
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {stats.incompletePayments > 0 && (
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <h4 className="font-medium text-warning mb-1">Incomplete Payments</h4>
                  <p className="text-sm text-muted-foreground">
                    {stats.incompletePayments} member(s) have incomplete payments
                  </p>
                </div>
              )}
              
              {stats.overdueMembers.length === 0 && stats.incompletePayments === 0 && (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">No alerts at the moment</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

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
        <Link to="/checkin">
          <Card className="card-stats hover:scale-105 transition-all duration-200 cursor-pointer">
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-lg bg-success/10 text-success mr-4">
                <UserCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Member Check-in</h3>
                <p className="text-sm text-muted-foreground">Check in gym members</p>
              </div>
            </CardContent>
          </Card>
        </Link>

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
      </motion.div>
    </div>
  );
}