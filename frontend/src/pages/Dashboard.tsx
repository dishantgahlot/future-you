import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBullseye,
  faArrowTrendUp,
  faFire,
  faTrophy,
  faCalendarDays,
  faCircleCheck,
  faPersonRunning,
  faBookOpen,
  faDroplet,
  faSpa,
} from '@fortawesome/free-solid-svg-icons'
import { motion } from 'framer-motion'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

const statCards = [
  { name: 'Active Habits', value: '12', change: '+2 this week', icon: faBullseye, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { name: 'Completion Rate', value: '87%', change: '+5% vs last week', icon: faCircleCheck, color: 'text-green-500', bg: 'bg-green-500/10' },
  { name: 'Current Streak', value: '14 days', change: 'Longest: 45 days', icon: faFire, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { name: 'Predictions', value: '8', change: '3 high confidence', icon: faArrowTrendUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
]

const weeklyData = [
  { day: 'Mon', completion: 85, target: 100 },
  { day: 'Tue', completion: 92, target: 100 },
  { day: 'Wed', completion: 78, target: 100 },
  { day: 'Thu', completion: 88, target: 100 },
  { day: 'Fri', completion: 95, target: 100 },
  { day: 'Sat', completion: 70, target: 100 },
  { day: 'Sun', completion: 65, target: 100 },
]

const categoryData = [
  { category: 'Health', count: 4, rate: 92 },
  { category: 'Fitness', count: 3, rate: 78 },
  { category: 'Learning', count: 2, rate: 85 },
  { category: 'Productivity', count: 2, rate: 90 },
  { category: 'Mental Health', count: 1, rate: 100 },
]

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's your progress overview.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors">
            Add Habit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-2">{stat.change}</p>
              </div>
              <div className={`${stat.bg} ${stat.color} p-3 rounded-lg`}>
                <FontAwesomeIcon icon={stat.icon} className="h-6 w-6" aria-hidden="true" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Weekly Completion</h2>
            <FontAwesomeIcon icon={faCalendarDays} className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 110]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value: number) => [`${value}%`, 'Completion']}
                />
                <Area
                  type="monotone"
                  dataKey="completion"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCompletion)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Category Breakdown</h2>
            <FontAwesomeIcon icon={faTrophy} className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="space-y-4">
            {categoryData.map((cat, index) => (
              <motion.div
                key={cat.category}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{cat.category}</span>
                  <span className="text-sm text-muted-foreground">{cat.count} habits</span>
                </div>
                <div className="h-2 bg-accent rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.rate}%` }}
                    transition={{ delay: 0.5 + index * 0.05, duration: 0.8 }}
                    className="h-full bg-primary-500 rounded-full"
                  />
                </div>
                <div className="flex justify-end">
                  <span className="text-xs font-medium text-primary-500">{cat.rate}%</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card border border-border rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Today's Habits</h2>
          <button className="text-sm text-primary-500 hover:underline">View All</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Morning Run', category: 'Fitness', progress: 100, color: 'bg-green-500', icon: faPersonRunning },
            { name: 'Read 30 min', category: 'Learning', progress: 60, color: 'bg-blue-500', icon: faBookOpen },
            { name: 'Drink 3L Water', category: 'Health', progress: 80, color: 'bg-cyan-500', icon: faDroplet },
            { name: 'Meditation', category: 'Mental Health', progress: 0, color: 'bg-purple-500', icon: faSpa },
          ].map((habit, index) => (
            <motion.div
              key={habit.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              className="p-4 bg-accent/50 rounded-lg"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-600 flex items-center justify-center">
                  <FontAwesomeIcon icon={habit.icon} className="text-lg" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{habit.name}</p>
                  <p className="text-xs text-muted-foreground">{habit.category}</p>
                </div>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${habit.progress}%` }}
                  transition={{ delay: 0.6 + index * 0.05, duration: 0.5 }}
                  className={`h-full ${habit.color} rounded-full`}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right mt-1">{habit.progress}% complete</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}