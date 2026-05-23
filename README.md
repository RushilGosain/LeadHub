# LeadHub – Smart Service Lead Distribution Platform

LeadHub is a modern B2B lead distribution platform that connects customers with service providers through an intelligent real-time lead assignment system.

Built using Next.js, Supabase, TypeScript, and Tailwind CSS.

---

## 🚀 Features

### Customer Side
- Service enquiry form
- Multiple service categories
- Contact information collection
- Real-time lead submission
- Responsive modern UI

### Provider Dashboard
- Real-time lead updates
- Assigned lead tracking
- Customer details access
- Quota management
- Live dashboard metrics
- Mobile responsive interface

### Platform Features
- Intelligent lead distribution
- Round-robin assignment system
- Real-time notifications
- Supabase Realtime integration
- Authentication system
- Row Level Security (RLS)
- Production-ready architecture

---

## 📸 Screenshots

### Landing Page
<img width="1470" height="807" alt="Screenshot 2026-05-24 at 12 44 40 AM" src="https://github.com/user-attachments/assets/67c90a08-06d4-4a62-8968-e1e64cef3339" />


### Enquiry Form
<img width="1470" height="807" alt="Screenshot 2026-05-24 at 12 44 49 AM" src="https://github.com/user-attachments/assets/d22a0329-e554-40c4-96f3-cddf55fbb06d" />



### Provider Dashboard
<img width="1470" height="807" alt="Screenshot 2026-05-24 at 12 45 12 AM" src="https://github.com/user-attachments/assets/1dd69a30-71a5-4107-9a4e-c50a720f1c0e" />

<img width="1470" height="807" alt="Screenshot 2026-05-24 at 12 45 21 AM" src="https://github.com/user-attachments/assets/0d7d3bdb-151d-4d63-8c7a-0bc699805487" />


### Authentication
<img width="1470" height="807" alt="Screenshot 2026-05-24 at 12 47 43 AM" src="https://github.com/user-attachments/assets/89c67497-5f53-4aaa-aa06-929b2679b6a0" />


---

## 🏗 Architecture

```text
Customer
   ↓
Enquiry Form
   ↓
Supabase Database
   ↓
Lead Distribution Engine
   ↓
Provider Dashboard
   ↓
Realtime Updates
```

---

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Next.js 16 + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Backend | Supabase |
| Database | PostgreSQL |
| Authentication | Supabase Auth |
| Realtime | Supabase Realtime |
| UI Components | Shadcn UI |
| Icons | Lucide React |

---

## 📂 Project Structure

```bash
leadhub/
│
├── app/
│   ├── enquiry/
│   ├── dashboard/
│   ├── auth/
│   ├── api/
│   └── layout.tsx
│
├── components/
│
├── lib/
│   └── supabase/
│
├── hooks/
│
├── screenshots/
│
├── README.md
├── package.json
└── .env.local
```

---

## ⚙️ Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/auth/callback
```

---

## 🗄 Database Setup

1. Create a project on Supabase
2. Open SQL Editor
3. Run the provided migration SQL files
4. Enable Realtime for:
   - `leads`
   - `lead_assignments`

---

## 🚀 Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/LeadHub.git
```

### 2. Open Project

```bash
cd LeadHub
```

### 3. Install Dependencies

Using pnpm:

```bash
pnpm install
```

OR npm:

```bash
npm install
```

### 4. Run Development Server

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

---

## 🔐 Authentication

Provider authentication is handled using Supabase Auth.

Features:
- Sign up
- Login
- Protected dashboard routes
- Session management
- Secure authentication

---

## 📊 Database Tables

| Table | Purpose |
|------|---------|
| agents | Provider information |
| leads | Customer enquiries |
| lead_assignments | Lead-provider mapping |
| distribution_state | Round-robin state |
| service_provider_pools | Service-provider mapping |
| webhook_events | Event tracking |

---

## ⚡ Real-Time Functionality

LeadHub uses Supabase Realtime for:
- Instant dashboard updates
- Live lead assignments
- Real-time provider notifications

---

## 📱 Responsive Design

Optimized for:
- Mobile devices
- Tablets
- Desktop screens
- Large displays

---

## 🔄 Lead Distribution Flow

```text
Customer submits enquiry
        ↓
Lead stored in database
        ↓
Distribution engine runs
        ↓
Provider selected
        ↓
Lead assigned
        ↓
Dashboard updates instantly
```

---

## 🌐 Deployment

### Deploy on Vercel

1. Push project to GitHub
2. Import repository into Vercel
3. Add environment variables
4. Deploy

---

## 🔗 Live Demo

```text
https://your-project.vercel.app
```

---

## 📦 Build for Production

```bash
pnpm build
```

Run production server:

```bash
pnpm start
```

---

## 🧪 Future Improvements

- AI-based provider matching
- WhatsApp integration
- Analytics dashboard
- SMS notifications
- Admin panel
- Multi-city support
- Payment integration

---

## 🛡 Security Features

- Row Level Security (RLS)
- Secure authentication
- Environment variable protection
- Protected API routes
- Secure database policies

---

## 📈 Performance Features

- Real-time subscriptions
- Optimized queries
- SSR support
- Code splitting
- Fast page loads
- CDN deployment ready

---

## 🤝 Contributing

Pull requests and suggestions are welcome.

---

## 📄 License

This project is available for educational and production use.

---

## 👨‍💻 Author

Developed using:
- Next.js
- Supabase
- Tailwind CSS
- TypeScript

---

## ⭐ Project Status

✅ Production Ready  
✅ Real-Time Enabled  
✅ Mobile Responsive  
✅ Secure Authentication  
✅ Modern UI/UX  

---

## 🚀 Run Project

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

---
