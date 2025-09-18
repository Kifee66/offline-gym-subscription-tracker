import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Plus, 
  Filter, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Phone, 
  Mail,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { db, Member } from '@/lib/database';
import { format } from 'date-fns';
import { Link, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

const statusStyles = {
  active: 'bg-success/10 text-success border-success/20',
  expired: 'bg-destructive/10 text-destructive border-destructive/20',
  'expiring-soon': 'bg-warning/10 text-warning border-warning/20'
};

const statusLabels = {
  active: 'Active',
  expired: 'Expired',
  'expiring-soon': 'Expiring Soon'
};

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const loadMembers = async () => {
      try {
        await db.updateMemberStatuses();
        const allMembers = await db.getAllMembers();
        setMembers(allMembers);
        setFilteredMembers(allMembers);

        // Check for filter parameter from URL
        const filterParam = searchParams.get('filter');
        if (filterParam && filterParam !== 'all') {
          setStatusFilter(filterParam);
        }
      } catch (error) {
        console.error('Error loading members:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [searchParams]);

  useEffect(() => {
    let filtered = members;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => member.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(member =>
        member.fullName.toLowerCase().includes(query) ||
        member.phone.includes(query) ||
        (member.email && member.email.toLowerCase().includes(query))
      );
    }

    setFilteredMembers(filtered);
  }, [members, searchQuery, statusFilter]);

  const handleDeleteMember = async (memberId: number) => {
    if (window.confirm('Are you sure you want to delete this member?')) {
      try {
        await db.members.delete(memberId);
        // Also delete associated payments
        await db.payments.where('memberId').equals(memberId).delete();
        
        const updatedMembers = members.filter(m => m.id !== memberId);
        setMembers(updatedMembers);
      } catch (error) {
        console.error('Error deleting member:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Members</h1>
          <Button disabled>
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
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
          <h1 className="text-3xl font-bold text-foreground">Members</h1>
          <p className="text-muted-foreground">
            Manage your gym members and their subscriptions
          </p>
        </div>
        <Link to="/members/add">
          <Button className="btn-gym-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </Link>
      </motion.div>

      {/* Search and Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members by name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Members</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expiring-soon">Expiring Soon</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Members List */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid gap-4"
      >
        {filteredMembers.length > 0 ? (
          filteredMembers.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="card-stats hover:scale-[1.02] transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {member.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{member.fullName}</CardTitle>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            {member.phone}
                          </div>
                          {member.email && (
                            <div className="flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {member.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn("border", statusStyles[member.status])}
                    >
                      {statusLabels[member.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Subscription</p>
                      <p className="font-medium capitalize">{member.subscriptionType}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fee</p>
                      <p className="font-medium">KSh {member.subscriptionFee.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Renewal Date</p>
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        <p className="font-medium">{format(member.renewalDate, 'MMM dd, yyyy')}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Member Since</p>
                      <p className="font-medium">{format(member.startDate, 'MMM yyyy')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-border">
                    <Link to={`/members/${member.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteMember(member.id!)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery || statusFilter !== 'all' ? 'No members found' : 'No members yet'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by adding your first gym member'
              }
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Link to="/members/add">
                <Button className="btn-gym-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Member
                </Button>
              </Link>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}