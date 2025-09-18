import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { ArrowLeft, UserPlus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/database';
import { Link } from 'react-router-dom';

const memberSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other']),
  subscriptionType: z.enum(['monthly', 'quarterly', 'annual']),
  subscriptionFee: z.number().min(1, 'Subscription fee must be greater than 0'),
  startDate: z.date({
    required_error: 'Start date is required',
  }),
});

type MemberFormData = z.infer<typeof memberSchema>;

const subscriptionOptions = [
  { value: 'monthly', label: 'Monthly', defaultFee: 2000 },
  { value: 'quarterly', label: 'Quarterly (3 months)', defaultFee: 5500 },
  { value: 'annual', label: 'Annual (12 months)', defaultFee: 20000 },
];

export default function AddMember() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      email: '',
      gender: 'male',
      subscriptionType: 'monthly',
      subscriptionFee: 2000,
      startDate: new Date(),
    },
  });

  const subscriptionType = form.watch('subscriptionType');

  // Update fee when subscription type changes
  const handleSubscriptionTypeChange = (value: 'monthly' | 'quarterly' | 'annual') => {
    const option = subscriptionOptions.find(opt => opt.value === value);
    if (option) {
      form.setValue('subscriptionFee', option.defaultFee);
    }
  };

  const onSubmit = async (data: MemberFormData) => {
    setLoading(true);
    try {
      // Calculate renewal date based on subscription type
      const renewalDate = db.calculateRenewalDate(data.startDate, data.subscriptionType);

      // Add member to database
      await db.members.add({
        fullName: data.fullName,
        phone: data.phone,
        email: data.email || undefined,
        gender: data.gender,
        subscriptionType: data.subscriptionType,
        subscriptionFee: data.subscriptionFee,
        startDate: data.startDate,
        renewalDate,
        status: 'active', // Will be calculated by the hook
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      toast({
        title: 'Member Added Successfully!',
        description: `${data.fullName} has been registered as a new member.`,
      });

      navigate('/members');
    } catch (error) {
      console.error('Error adding member:', error);
      toast({
        title: 'Error',
        description: 'Failed to add member. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center space-x-4"
      >
        <Link to="/members">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Add New Member</h1>
          <p className="text-muted-foreground">
            Register a new gym member and set up their subscription
          </p>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-2xl"
      >
        <Card className="card-stats">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="w-5 h-5" />
              <span>Member Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="+254 712 345 678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Subscription Information */}
                <div className="pt-6 border-t border-border">
                  <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>Subscription Details</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="subscriptionType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subscription Type *</FormLabel>
                          <Select 
                            onValueChange={(value: 'monthly' | 'quarterly' | 'annual') => {
                              field.onChange(value);
                              handleSubscriptionTypeChange(value);
                            }} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select subscription type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subscriptionOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
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
                      name="subscriptionFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subscription Fee (KSh) *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="2000" 
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Membership Start Date *</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field}
                            value={field.value ? field.value.toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-4 pt-6">
                  <Link to="/members">
                    <Button variant="outline" disabled={loading}>
                      Cancel
                    </Button>
                  </Link>
                  <Button 
                    type="submit" 
                    className="btn-gym-primary"
                    disabled={loading}
                  >
                    {loading ? 'Adding Member...' : 'Add Member'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}