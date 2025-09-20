import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  UserCheck, 
  AlertCircle, 
  Clock, 
  CheckCircle2,
  XCircle,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { db, Member, type CheckIn } from '@/lib/database';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusStyles = {
  active: 'bg-success/10 text-success border-success/20',
  due: 'bg-warning/10 text-warning border-warning/20',
  overdue: 'bg-destructive/10 text-destructive border-destructive/20'
};

const paymentStatusStyles = {
  paid: 'bg-success/10 text-success border-success/20',
  incomplete: 'bg-destructive/10 text-destructive border-destructive/20'
};

export default function CheckIn() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [recentCheckIns, setRecentCheckIns] = useState<Array<CheckIn & { memberName: string }>>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRecentCheckIns();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchMembers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchMembers = async () => {
    try {
      setLoading(true);
      await db.updateMemberStatuses();
      const results = await db.searchMembers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to search members',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRecentCheckIns = async () => {
    try {
      const checkIns = await db.getRecentCheckIns(5);
      setRecentCheckIns(checkIns);
    } catch (error) {
      console.error('Error loading recent check-ins:', error);
    }
  };

  const handleCheckIn = async (member: Member) => {
    try {
      if (member.status === 'overdue' || member.paymentStatus === 'incomplete') {
        toast({
          title: 'Check-in Blocked',
          description: `Cannot check in ${member.fullName}: ${
            member.status === 'overdue' ? 'Overdue subscription' : 'Incomplete payment'
          }`,
          variant: 'destructive',
        });
        return;
      }

      await db.checkInMember(member.id!);
      await loadRecentCheckIns();
      
      toast({
        title: 'Check-in Successful',
        description: `${member.fullName} checked in successfully`,
        variant: 'default',
      });

      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      toast({
        title: 'Check-in Failed',
        description: error instanceof Error ? error.message : 'Failed to check in member',
        variant: 'destructive',
      });
    }
  };

  const canCheckIn = (member: Member) => {
    return member.status === 'active' && member.paymentStatus === 'paid';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Member Check-In</h1>
          <p className="text-muted-foreground">
            Search and check in gym members
          </p>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="card-stats">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="w-5 h-5 mr-2" />
              Search Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {loading && (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {searchResults.map((member) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border border-border rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center text-white font-semibold">
                          {member.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold">{member.fullName}</h3>
                          <p className="text-sm text-muted-foreground">{member.phone}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="outline" 
                          className={cn("border", statusStyles[member.status])}
                        >
                          {member.status === 'due' ? 'Due' : member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={cn("border", paymentStatusStyles[member.paymentStatus])}
                        >
                          {member.paymentStatus === 'paid' ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" /> Paid</>
                          ) : (
                            <><XCircle className="w-3 h-3 mr-1" /> Incomplete</>
                          )}
                        </Badge>
                        
                        <Button
                          onClick={() => handleCheckIn(member)}
                          disabled={!canCheckIn(member)}
                          variant={canCheckIn(member) ? "default" : "secondary"}
                          size="sm"
                        >
                          {canCheckIn(member) ? (
                            <><UserCheck className="w-4 h-4 mr-1" /> Check In</>
                          ) : (
                            <><AlertCircle className="w-4 h-4 mr-1" /> Blocked</>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Subscription</p>
                          <p className="font-medium capitalize">{member.subscriptionType}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Renewal Date</p>
                          <p className="font-medium">{format(member.renewalDate, 'MMM dd, yyyy')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Last Check-in</p>
                          <p className="font-medium">
                            {member.lastCheckIn ? format(member.lastCheckIn, 'MMM dd, HH:mm') : 'Never'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && searchResults.length === 0 && !loading && (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No members found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Check-ins */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="card-stats">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Recent Check-ins
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentCheckIns.length > 0 ? (
              <div className="space-y-3">
                {recentCheckIns.map((checkIn, index) => (
                  <motion.div
                    key={checkIn.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center">
                        <UserCheck className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{checkIn.memberName}</p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(checkIn.checkInDate, 'MMM dd, yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No recent check-ins</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}