import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

// Mock data for charts
const hourlyOrders = [
  { hour: '9AM', orders: 12, revenue: 480 },
  { hour: '10AM', orders: 18, revenue: 720 },
  { hour: '11AM', orders: 25, revenue: 1000 },
  { hour: '12PM', orders: 42, revenue: 1680 },
  { hour: '1PM', orders: 48, revenue: 1920 },
  { hour: '2PM', orders: 35, revenue: 1400 },
  { hour: '3PM', orders: 22, revenue: 880 },
  { hour: '4PM', orders: 18, revenue: 720 },
  { hour: '5PM', orders: 28, revenue: 1120 },
  { hour: '6PM', orders: 45, revenue: 1800 },
  { hour: '7PM', orders: 52, revenue: 2080 },
  { hour: '8PM', orders: 38, revenue: 1520 },
];

const weeklyRevenue = [
  { day: 'Mon', revenue: 2400, orders: 65 },
  { day: 'Tue', revenue: 2100, orders: 58 },
  { day: 'Wed', revenue: 2800, orders: 72 },
  { day: 'Thu', revenue: 2600, orders: 68 },
  { day: 'Fri', revenue: 3200, orders: 85 },
  { day: 'Sat', revenue: 3800, orders: 98 },
  { day: 'Sun', revenue: 3500, orders: 92 },
];

const categoryData = [
  { name: 'Desi', value: 42, color: 'hsl(252, 76%, 58%)' },
  { name: 'Fast Food', value: 28, color: 'hsl(25, 95%, 53%)' },
  { name: 'Continental', value: 15, color: 'hsl(142, 71%, 45%)' },
  { name: 'Beverages', value: 10, color: 'hsl(38, 92%, 50%)' },
  { name: 'Desserts', value: 5, color: 'hsl(270, 60%, 50%)' },
];

const ratingsData = [
  { date: 'Dec 10', rating: 4.5, count: 12 },
  { date: 'Dec 11', rating: 4.7, count: 15 },
  { date: 'Dec 12', rating: 4.4, count: 10 },
  { date: 'Dec 13', rating: 4.8, count: 18 },
  { date: 'Dec 14', rating: 4.6, count: 14 },
  { date: 'Dec 15', rating: 4.9, count: 20 },
  { date: 'Dec 16', rating: 4.7, count: 16 },
];

const COLORS = ['hsl(252, 76%, 58%)', 'hsl(25, 95%, 53%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(270, 60%, 50%)'];

export function StatisticsCharts() {
  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-6 mt-6">
          {/* Hourly Orders Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hourly Orders & Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourlyOrders}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="hour" className="text-xs" />
                  <YAxis yAxisId="left" className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="orders" fill="hsl(252, 76%, 58%)" name="Orders" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="revenue" fill="hsl(25, 95%, 53%)" name="Revenue ($)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sales by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Customer Ratings Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Ratings Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={ratingsData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis domain={[4, 5]} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="rating"
                      stroke="hsl(38, 92%, 50%)"
                      fill="hsl(38, 92%, 50%)"
                      fillOpacity={0.2}
                      name="Avg Rating"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="week" className="space-y-6 mt-6">
          {/* Weekly Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Weekly Revenue & Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis yAxisId="left" className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(252, 76%, 58%)"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(252, 76%, 58%)', strokeWidth: 2 }}
                    name="Revenue ($)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="orders"
                    stroke="hsl(25, 95%, 53%)"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(25, 95%, 53%)', strokeWidth: 2 }}
                    name="Orders"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sales by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Customer Ratings Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Feedback Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={ratingsData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="hsl(142, 71%, 45%)"
                      name="Feedback Count"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="month" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Monthly analytics view coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Custom date range selection coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
