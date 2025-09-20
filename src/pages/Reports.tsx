import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Calendar, TrendingUp, Users, DollarSign, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, addDays, subMonths } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { db, Member, Payment } from '@/lib/database';

interface ReportData {
  activeMembers: number;
  expiredMembers: number;
  expiringSoonMembers: number;
  totalRevenue: number;
  monthlyRevenue: { month: string; revenue: number }[];
  upcomingRenewals: Member[];
  paymentMethods: { name: string; value: number; color: string }[];
  membershipTypes: { name: string; value: number; color: string }[];
}

const COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  accent: 'hsl(var(--accent))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  destructive: 'hsl(var(--destructive))',
};

export default function Reports() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    generateReports();
  }, [selectedYear, selectedMonth]);

  const generateReports = async () => {
    try {
      setIsLoading(true);
      
      const [members, payments] = await Promise.all([
        db.getAllMembers(),
        db.payments.toArray(),
      ]);

      // Update member statuses
      await db.updateMemberStatuses();
      const updatedMembers = await db.getAllMembers();

      // Calculate member stats
      const activeMembers = updatedMembers.filter(m => m.status === 'active').length;
      const dueMembers = updatedMembers.filter(m => m.status === 'due').length;
      const overdueMembers = updatedMembers.filter(m => m.status === 'overdue').length;

      // Calculate upcoming renewals (next 30 days)
      const thirtyDaysFromNow = addDays(new Date(), 30);
      const upcomingRenewals = updatedMembers.filter(member =>
        member.renewalDate <= thirtyDaysFromNow && member.status !== 'overdue'
      ).slice(0, 10);

      // Calculate monthly revenue for the past 12 months
      const monthlyRevenue = [];
      for (let i = 11; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        
        const monthPayments = payments.filter(p =>
          isWithinInterval(p.paymentDate, { start: monthStart, end: monthEnd })
        );
        
        const revenue = monthPayments.reduce((sum, p) => sum + p.amount, 0);
        
        monthlyRevenue.push({
          month: format(monthDate, 'MMM yyyy'),
          revenue,
        });
      }

      // Calculate total revenue for selected month
      const selectedMonthStart = new Date(selectedYear, selectedMonth - 1, 1);
      const selectedMonthEnd = endOfMonth(selectedMonthStart);
      const selectedMonthPayments = payments.filter(p =>
        isWithinInterval(p.paymentDate, { start: selectedMonthStart, end: selectedMonthEnd })
      );
      const totalRevenue = selectedMonthPayments.reduce((sum, p) => sum + p.amount, 0);

      // Payment method distribution
      const paymentMethodStats = payments.reduce((acc, payment) => {
        acc[payment.paymentMethod] = (acc[payment.paymentMethod] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const paymentMethods = [
        { name: 'Cash', value: paymentMethodStats.cash || 0, color: COLORS.success },
        { name: 'M-Pesa', value: paymentMethodStats.mpesa || 0, color: COLORS.primary },
        { name: 'Card', value: paymentMethodStats.card || 0, color: COLORS.secondary },
        { name: 'Bank Transfer', value: paymentMethodStats['bank-transfer'] || 0, color: COLORS.accent },
      ];

      // Membership type distribution
      const membershipTypeStats = updatedMembers.reduce((acc, member) => {
        acc[member.subscriptionType] = (acc[member.subscriptionType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const membershipTypes = [
        { name: 'Daily', value: membershipTypeStats.daily || 0, color: COLORS.primary },
        { name: 'Weekly', value: membershipTypeStats.weekly || 0, color: COLORS.secondary },
        { name: 'Monthly', value: membershipTypeStats.monthly || 0, color: COLORS.accent },
      ];

      setReportData({
        activeMembers,
        expiredMembers: dueMembers,
        expiringSoonMembers: overdueMembers,
        totalRevenue,
        monthlyRevenue,
        upcomingRenewals,
        paymentMethods,
        membershipTypes,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate reports',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = async () => {
    try {
      const [members, payments] = await Promise.all([
        db.getAllMembers(),
        db.payments.toArray(),
      ]);

      // Create CSV content
      let csvContent = 'Member Name,Phone,Email,Status,Subscription Type,Start Date,Renewal Date,Fee\n';
      
      members.forEach(member => {
        csvContent += `"${member.fullName}","${member.phone}","${member.email || ''}","${member.status}","${member.subscriptionType}","${format(member.startDate, 'yyyy-MM-dd')}","${format(member.renewalDate, 'yyyy-MM-dd')}","${member.subscriptionFee}"\n`;
      });

      csvContent += '\n\nPayment History\n';
      csvContent += 'Member ID,Amount,Method,Date,Period,Notes\n';
      
      payments.forEach(payment => {
        const member = members.find(m => m.id === payment.memberId);
        csvContent += `"${member?.fullName || 'Unknown'}","${payment.amount}","${payment.paymentMethod}","${format(payment.paymentDate, 'yyyy-MM-dd')}","${payment.renewalPeriod}","${payment.notes || ''}"\n`;
      });

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gym-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Report exported successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export report',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: Member['status']) => {
    const variants = {
      active: 'bg-success/10 text-success border-success/20',
      due: 'bg-warning/10 text-warning border-warning/20',
      overdue: 'bg-destructive/10 text-destructive border-destructive/20',
    };

    return (
      <Badge variant="outline" className={variants[status]}>
        {status === 'due' ? 'Due' : status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading || !reportData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Track your gym's performance and insights</p>
        </div>

        <div className="flex gap-2">
          <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {format(new Date(2024, i), 'MMMM')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => (
                <SelectItem key={2020 + i} value={(2020 + i).toString()}>
                  {2020 + i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Users className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{reportData.activeMembers}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired Members</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{reportData.expiredMembers}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Calendar className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{reportData.expiringSoonMembers}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {reportData.totalRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables */}
      <Tabs defaultValue="charts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="renewals">Upcoming Renewals</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-6">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue Trend</CardTitle>
              <CardDescription>Revenue over the past 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reportData.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    dot={{ fill: COLORS.primary }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Distribution of payment methods</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={reportData.paymentMethods}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {reportData.paymentMethods.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-4">
                  {reportData.paymentMethods.map((method, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: method.color }}
                      />
                      <span className="text-sm text-muted-foreground">
                        {method.name} ({method.value})
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Membership Types */}
            <Card>
              <CardHeader>
                <CardTitle>Membership Types</CardTitle>
                <CardDescription>Distribution of subscription plans</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={reportData.membershipTypes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="renewals">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Renewals</CardTitle>
              <CardDescription>Members with renewals due in the next 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.upcomingRenewals.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No upcoming renewals</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead>Renewal Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.upcomingRenewals.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.fullName}</TableCell>
                        <TableCell>{member.phone}</TableCell>
                        <TableCell className="capitalize">{member.subscriptionType}</TableCell>
                        <TableCell>{format(member.renewalDate, 'PPP')}</TableCell>
                        <TableCell>{getStatusBadge(member.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}