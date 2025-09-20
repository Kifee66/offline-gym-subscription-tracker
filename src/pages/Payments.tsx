import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Calendar, DollarSign, Filter, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { db, Payment, Member } from '@/lib/database';

const paymentSchema = z.object({
  memberId: z.number(),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  paymentMethod: z.enum(['cash', 'mpesa', 'card', 'bank-transfer']),
  paymentDate: z.date(),
  renewalPeriod: z.string().min(1, 'Renewal period is required'),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentWithMember extends Payment {
  memberName?: string;
}

export default function Payments() {
  const [payments, setPayments] = useState<PaymentWithMember[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentWithMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentDate: new Date(),
      paymentMethod: 'cash',
      notes: '',
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, searchQuery, selectedMember]);

  const loadData = async () => {
    try {
      const [paymentsData, membersData] = await Promise.all([
        db.payments.orderBy('paymentDate').reverse().toArray(),
        db.members.orderBy('fullName').toArray(),
      ]);

      // Enrich payments with member names
      const enrichedPayments = paymentsData.map(payment => {
        const member = membersData.find(m => m.id === payment.memberId);
        return {
          ...payment,
          memberName: member?.fullName || 'Unknown Member',
        };
      });

      setPayments(enrichedPayments);
      setMembers(membersData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load payments data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = payments;

    if (searchQuery) {
      filtered = filtered.filter(payment =>
        payment.memberName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.renewalPeriod.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedMember) {
      filtered = filtered.filter(payment => payment.memberId === selectedMember);
    }

    setFilteredPayments(filtered);
  };

  const onSubmit = async (data: PaymentFormData) => {
    try {
      // Add payment to database
      const member = await db.members.get(data.memberId);
      await db.payments.add({
        memberId: data.memberId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paymentDate: data.paymentDate,
        renewalPeriod: data.renewalPeriod,
        subscriptionType: member?.subscriptionType || 'monthly',
        notes: data.notes || '',
        createdAt: new Date(),
      });

      // Update member's renewal date and status
      const member = await db.members.get(data.memberId);
      if (member) {
        const newRenewalDate = db.calculateRenewalDate(data.paymentDate, member.subscriptionType);
        await db.members.update(data.memberId, {
          renewalDate: newRenewalDate,
        });
      }

      toast({
        title: 'Success',
        description: 'Payment recorded successfully',
      });

      setIsAddingPayment(false);
      form.reset({
        paymentDate: new Date(),
        paymentMethod: 'cash',
        notes: '',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to record payment',
        variant: 'destructive',
      });
    }
  };

  const getPaymentMethodBadge = (method: Payment['paymentMethod']) => {
    const variants = {
      cash: 'bg-success/10 text-success border-success/20',
      mpesa: 'bg-primary/10 text-primary border-primary/20',
      card: 'bg-secondary/10 text-secondary border-secondary/20',
      'bank-transfer': 'bg-accent/10 text-accent border-accent/20',
    };

    return (
      <Badge variant="outline" className={variants[method]}>
        {method === 'bank-transfer' ? 'Bank Transfer' : method.charAt(0).toUpperCase() + method.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
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
          <h1 className="text-3xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground">Track and manage member payments</p>
        </div>

        <Dialog open={isAddingPayment} onOpenChange={setIsAddingPayment}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary-glow hover:shadow-glow transition-all">
              <Plus className="w-4 h-4 mr-2" />
              Add Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record New Payment</DialogTitle>
              <DialogDescription>
                Add a new payment record for a member
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="memberId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Member</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {members.map((member) => (
                            <SelectItem key={member.id} value={member.id!.toString()}>
                              {member.fullName} - {member.phone}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="mpesa">M-Pesa</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date()}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="renewalPeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Renewal Period</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Jan 2024, Q1 2024" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Additional notes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    Record Payment
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddingPayment(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search payments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select onValueChange={(value) => setSelectedMember(value === 'all' ? null : parseInt(value))}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id!.toString()}>
                    {member.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <div className="grid gap-4">
        {filteredPayments.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No payments found</p>
                <p className="text-sm text-muted-foreground">Add a payment to get started</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredPayments.map((payment) => (
            <motion.div
              key={payment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="hover:shadow-elegant transition-all">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{payment.memberName}</h3>
                        {getPaymentMethodBadge(payment.paymentMethod)}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {format(payment.paymentDate, 'PPP')}
                        </div>
                        <div>Period: {payment.renewalPeriod}</div>
                        {payment.notes && <div>Notes: {payment.notes}</div>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign className="w-4 h-4 text-success" />
                        <span className="text-2xl font-bold text-success">
                          {payment.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}