import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Building2, DollarSign, Shield, Upload, Moon, Sun } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme } from 'next-themes';
import { useToast } from '@/hooks/use-toast';
import { db, GymSettings } from '@/lib/database';

const settingsSchema = z.object({
  gymName: z.string().min(1, 'Gym name is required'),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  defaultMonthlyFee: z.number().min(0, 'Fee must be non-negative'),
  defaultQuarterlyFee: z.number().min(0, 'Fee must be non-negative'),
  defaultAnnualFee: z.number().min(0, 'Fee must be non-negative'),
  pinCode: z.string().min(4, 'PIN must be at least 4 digits').optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function Settings() {
  const [settings, setSettings] = useState<GymSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPinProtected, setIsPinProtected] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      gymName: '',
      contactPhone: '',
      contactEmail: '',
      address: '',
      defaultMonthlyFee: 2000,
      defaultQuarterlyFee: 5500,
      defaultAnnualFee: 20000,
      pinCode: '',
    },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const gymSettings = await db.getGymSettings();
      
      if (gymSettings) {
        setSettings(gymSettings);
        setIsPinProtected(!!gymSettings.pinCode);
        
        if (!gymSettings.pinCode) {
          setIsAuthenticated(true);
        }
        
        form.reset({
          gymName: gymSettings.gymName,
          contactPhone: gymSettings.contactPhone || '',
          contactEmail: gymSettings.contactEmail || '',
          address: gymSettings.address || '',
          defaultMonthlyFee: gymSettings.defaultMonthlyFee,
          defaultQuarterlyFee: gymSettings.defaultQuarterlyFee,
          defaultAnnualFee: gymSettings.defaultAnnualFee,
          pinCode: '', // Never pre-fill PIN for security
        });
      } else {
        setIsAuthenticated(true);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const authenticatePin = async () => {
    if (!settings?.pinCode) return;
    
    if (enteredPin === settings.pinCode) {
      setIsAuthenticated(true);
      setEnteredPin('');
      toast({
        title: 'Success',
        description: 'PIN verified successfully',
      });
    } else {
      toast({
        title: 'Error',
        description: 'Incorrect PIN',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    try {
      setIsSaving(true);

      const settingsData = {
        gymName: data.gymName,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        address: data.address,
        defaultMonthlyFee: data.defaultMonthlyFee,
        defaultQuarterlyFee: data.defaultQuarterlyFee,
        defaultAnnualFee: data.defaultAnnualFee,
        pinCode: data.pinCode || settings?.pinCode,
        updatedAt: new Date(),
      };

      if (settings?.id) {
        await db.settings.update(settings.id, settingsData);
      } else {
        await db.settings.add({
          ...settingsData,
          createdAt: new Date(),
        });
      }

      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });

      // Reload settings to get updated data
      await loadSettings();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const logoData = e.target?.result as string;
        // Store logo as base64 string
        if (settings?.id) {
          db.settings.update(settings.id, { gymLogo: logoData });
          toast({
            title: 'Success',
            description: 'Logo uploaded successfully',
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAllData = async () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      try {
        await Promise.all([
          db.members.clear(),
          db.payments.clear(),
        ]);
        
        toast({
          title: 'Success',
          description: 'All data cleared successfully',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to clear data',
          variant: 'destructive',
        });
      }
    }
  };

  const exportData = async () => {
    try {
      const [members, payments, settings] = await Promise.all([
        db.members.toArray(),
        db.payments.toArray(),
        db.settings.toArray(),
      ]);

      const exportData = {
        members,
        payments,
        settings,
        exportDate: new Date().toISOString(),
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gym-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Data exported successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export data',
        variant: 'destructive',
      });
    }
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

  // PIN Authentication Screen
  if (isPinProtected && !isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center min-h-[400px]"
      >
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Shield className="w-5 h-5" />
              Settings Protected
            </CardTitle>
            <CardDescription>
              Enter your PIN to access settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">PIN Code</Label>
              <Input
                id="pin"
                type="password"
                placeholder="Enter your PIN"
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && authenticatePin()}
              />
            </div>
            <Button onClick={authenticatePin} className="w-full">
              Unlock Settings
            </Button>
          </CardContent>
        </Card>
      </motion.div>
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
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your gym configuration and preferences</p>
        </div>

        <div className="flex items-center gap-2">
          <Sun className="h-4 w-4" />
          <Switch
            checked={theme === 'dark'}
            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
          />
          <Moon className="h-4 w-4" />
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Gym Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Gym Information
              </CardTitle>
              <CardDescription>
                Basic information about your gym
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="gymName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gym Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Awesome Gym" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+254 700 000 000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="info@mygym.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="123 Fitness Street, Nairobi, Kenya" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label htmlFor="logo">Gym Logo</Label>
                <div className="flex items-center gap-4">
                  {settings?.gymLogo && (
                    <img
                      src={settings.gymLogo}
                      alt="Gym Logo"
                      className="w-16 h-16 object-cover rounded-lg border"
                    />
                  )}
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-muted file:text-muted-foreground"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Default Fees */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Default Subscription Fees
              </CardTitle>
              <CardDescription>
                Set default fees for different subscription types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="defaultMonthlyFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Fee</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="2000"
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
                  name="defaultQuarterlyFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quarterly Fee</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="5500"
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
                  name="defaultAnnualFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Annual Fee</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="20000"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Protect your settings with a PIN code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="pinCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIN Code (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={isPinProtected ? "Enter new PIN or leave blank to keep current" : "Set a PIN to protect settings"}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {isPinProtected ? "A PIN is currently set. Leave blank to keep the current PIN." : "Set a PIN to protect access to settings."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button 
            type="submit" 
            disabled={isSaving}
            className="bg-gradient-to-r from-primary to-primary-glow hover:shadow-glow transition-all"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </form>
      </Form>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Export or clear your gym data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={exportData} variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Export Backup
            </Button>
            <Button onClick={clearAllData} variant="destructive">
              Clear All Data
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Export creates a backup of all your members, payments, and settings. 
            Clear all data will permanently delete everything.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}