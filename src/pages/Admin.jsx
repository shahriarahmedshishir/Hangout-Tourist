import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutDashboard, Plane, Building2, Palmtree, Users, Settings, LogOut, TrendingUp, DollarSign, ShoppingCart, UserCheck, Plus, Search, Edit, Trash2, Menu, X, } from "lucide-react";
import { adminStats, recentBookings, flights, hotels, holidays } from "@/data/mockData";
import logo from "@/assets/logo.png";
const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "flights", label: "Flights", icon: Plane },
    { id: "hotels", label: "Hotels", icon: Building2 },
    { id: "holidays", label: "Holidays", icon: Palmtree },
    { id: "bookings", label: "Bookings", icon: ShoppingCart },
    { id: "users", label: "Users", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
];
const statusColors = {
    Confirmed: "bg-success/10 text-success",
    Pending: "bg-warning/10 text-warning",
    Cancelled: "bg-destructive/10 text-destructive",
};
const Admin = () => {
    const [view, setView] = useState("dashboard");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    return (<div className="flex min-h-screen bg-muted">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="" className="h-8 w-8"/>
            <span className="font-heading text-sm font-bold">Admin Panel</span>
          </div>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5"/>
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {sidebarItems.map((item) => (<button key={item.id} onClick={() => { setView(item.id); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${view === item.id
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}>
              <item.icon className="h-4 w-4"/>
              {item.label}
            </button>))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <Link to="/">
            <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground">
              <LogOut className="h-4 w-4"/> Back to Site
            </Button>
          </Link>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-foreground/50 lg:hidden" onClick={() => setSidebarOpen(false)}/>}

      {/* Main Content */}
      <div className="flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background px-6">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5"/>
          </button>
          <h1 className="font-heading text-lg font-bold capitalize text-foreground">{view}</h1>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
              <Input placeholder="Search..." className="w-64 bg-muted pl-10"/>
            </div>
          </div>
        </header>

        <main className="p-6">
          {view === "dashboard" && <DashboardView />}
          {view === "flights" && <ManageListView title="Flights" data={flights.map(f => ({ id: f.id, name: f.flightNo, sub: `${f.from} → ${f.to}`, value: `$${f.price}` }))}/>}
          {view === "hotels" && <ManageListView title="Hotels" data={hotels.map(h => ({ id: h.id, name: h.name, sub: h.location, value: `$${h.price}/night` }))}/>}
          {view === "holidays" && <ManageListView title="Holiday Packages" data={holidays.map(h => ({ id: h.id, name: h.title, sub: h.destination, value: `$${h.price}` }))}/>}
          {view === "bookings" && <BookingsView />}
          {view === "users" && <UsersView />}
          {view === "settings" && <SettingsView />}
        </main>
      </div>
    </div>);
};
const DashboardView = () => {
    const stats = [
        { label: "Total Bookings", value: adminStats.totalBookings.toLocaleString(), icon: ShoppingCart, change: "+12%" },
        { label: "Revenue", value: `$${(adminStats.totalRevenue / 1000).toFixed(0)}K`, icon: DollarSign, change: "+8%" },
        { label: "Active Users", value: adminStats.activeUsers.toLocaleString(), icon: UserCheck, change: "+15%" },
        { label: "Total Packages", value: adminStats.totalPackages.toString(), icon: TrendingUp, change: "+3" },
    ];
    return (<div>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (<div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-card animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-1 font-heading text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
              <div className="rounded-xl bg-accent p-3">
                <stat.icon className="h-5 w-5 text-accent-foreground"/>
              </div>
            </div>
            <p className="mt-2 text-xs text-success font-medium">{stat.change} from last month</p>
          </div>))}
      </div>

      {/* Recent Bookings */}
      <div className="rounded-2xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-5">
          <h3 className="font-heading font-bold text-foreground">Recent Bookings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">ID</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Customer</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Destination</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Amount</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((b) => (<tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-foreground">{b.id}</td>
                  <td className="px-5 py-3 text-foreground">{b.customer}</td>
                  <td className="px-5 py-3 text-foreground">{b.type}</td>
                  <td className="px-5 py-3 text-foreground">{b.destination}</td>
                  <td className="px-5 py-3 font-medium text-foreground">${b.amount}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[b.status]}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{b.date}</td>
                </tr>))}
            </tbody>
          </table>
        </div>
      </div>
    </div>);
};
const ManageListView = ({ title, data }) => (<div>
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-heading text-lg font-bold text-foreground">Manage {title}</h2>
      <Button className="gap-2 bg-gradient-primary text-primary-foreground"><Plus className="h-4 w-4"/> Add New</Button>
    </div>
    <div className="rounded-2xl border border-border bg-card shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">ID</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Details</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Price</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (<tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3 text-muted-foreground">{item.id}</td>
                <td className="px-5 py-3 font-medium text-foreground">{item.name}</td>
                <td className="px-5 py-3 text-muted-foreground">{item.sub}</td>
                <td className="px-5 py-3 font-medium text-primary">{item.value}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                      <Edit className="h-4 w-4"/>
                    </button>
                    <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4"/>
                    </button>
                  </div>
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  </div>);
const BookingsView = () => (<div>
    <h2 className="mb-4 font-heading text-lg font-bold text-foreground">All Bookings</h2>
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-5 py-3 text-left font-medium text-muted-foreground">ID</th>
            <th className="px-5 py-3 text-left font-medium text-muted-foreground">Customer</th>
            <th className="px-5 py-3 text-left font-medium text-muted-foreground">Type</th>
            <th className="px-5 py-3 text-left font-medium text-muted-foreground">Destination</th>
            <th className="px-5 py-3 text-left font-medium text-muted-foreground">Amount</th>
            <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-5 py-3 text-left font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {recentBookings.map((b) => (<tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-5 py-3 font-medium text-foreground">{b.id}</td>
              <td className="px-5 py-3 text-foreground">{b.customer}</td>
              <td className="px-5 py-3 text-foreground">{b.type}</td>
              <td className="px-5 py-3 text-foreground">{b.destination}</td>
              <td className="px-5 py-3 font-medium text-foreground">${b.amount}</td>
              <td className="px-5 py-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[b.status]}`}>{b.status}</span>
              </td>
              <td className="px-5 py-3">
                <div className="flex gap-2">
                  <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors"><Edit className="h-4 w-4"/></button>
                  <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><Trash2 className="h-4 w-4"/></button>
                </div>
              </td>
            </tr>))}
        </tbody>
      </table>
    </div>
  </div>);
const UsersView = () => {
    const users = [
        { id: 1, name: "John Smith", email: "john@email.com", bookings: 5, status: "Active" },
        { id: 2, name: "Sarah Johnson", email: "sarah@email.com", bookings: 3, status: "Active" },
        { id: 3, name: "Mike Wilson", email: "mike@email.com", bookings: 8, status: "Active" },
        { id: 4, name: "Emily Davis", email: "emily@email.com", bookings: 1, status: "Inactive" },
    ];
    return (<div>
      <h2 className="mb-4 font-heading text-lg font-bold text-foreground">User Management</h2>
      <div className="rounded-2xl border border-border bg-card shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">ID</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Bookings</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (<tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3 text-muted-foreground">{u.id}</td>
                <td className="px-5 py-3 font-medium text-foreground">{u.name}</td>
                <td className="px-5 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-5 py-3 text-foreground">{u.bookings}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${u.status === "Active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors"><Edit className="h-4 w-4"/></button>
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>);
};
const SettingsView = () => (<div className="max-w-lg">
    <h2 className="mb-4 font-heading text-lg font-bold text-foreground">Settings</h2>
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">Site Name</label>
        <Input defaultValue="Hangout Tourist" className="bg-muted"/>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">Support Email</label>
        <Input defaultValue="support@hangouttourist.com" className="bg-muted"/>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">Phone</label>
        <Input defaultValue="+1 (555) 123-4567" className="bg-muted"/>
      </div>
      <Button className="bg-gradient-primary text-primary-foreground">Save Changes</Button>
    </div>
  </div>);
export default Admin;
