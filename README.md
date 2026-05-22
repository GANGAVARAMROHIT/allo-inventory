# Allo Inventory

A modern inventory management system for tracking products, reservations, and warehouse stock levels. Built with Next.js, Prisma, PostgreSQL, and Redis.

## Features

- **Product Management** - Create, update, and manage inventory items
- **Warehouse Tracking** - Monitor stock levels across multiple warehouses
- **Reservation System** - Reserve products with confirmation and release capabilities
- **Real-time Updates** - Leveraging Redis for caching and performance
- **Responsive UI** - Beautiful, mobile-friendly interface built with shadcn/ui and TailwindCSS

## Tech Stack

- **Frontend**: Next.js 16.2.6, React 19.2.4, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis (Upstash)
- **UI Framework**: shadcn/ui, TailwindCSS 4, Radix UI
- **Validation**: Zod
- **Linting**: ESLint 9

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis instance (or Upstash Redis)

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd allo-inventory
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file:
```
DIRECT_URL=postgresql://user:password@localhost:5432/allo_inventory
REDIS_URL=redis://...
```

5. Set up the database:
```bash
npx prisma migrate dev
npm run seed
```

6. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
src/
├── app/
│   ├── api/              # API endpoints
│   │   ├── products/     # Product management endpoints
│   │   ├── warehouses/   # Warehouse endpoints
│   │   └── reservations/ # Reservation management endpoints
│   ├── reservation/      # Reservation UI pages
│   └── page.tsx          # Home page
├── components/
│   ├── layout/          # Layout components
│   ├── product/         # Product-related components
│   └── ui/              # Reusable UI components
└── lib/
    ├── prisma.ts        # Prisma client
    ├── redis.ts         # Redis client
    └── utils.ts         # Utility functions

prisma/
├── schema.prisma        # Database schema
└── seed.ts              # Database seed script
```

## API Endpoints

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create a new product

### Warehouses
- `GET /api/warehouses` - List all warehouses
- `POST /api/warehouses` - Create a new warehouse

### Reservations
- `GET /api/reservations` - List all reservations
- `POST /api/reservations` - Create a new reservation
- `GET /api/reservations/[id]/details` - Get reservation details
- `POST /api/reservations/[id]/confirm` - Confirm a reservation
- `POST /api/reservations/[id]/release` - Release a reservation

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Start production server
npm run lint       # Run ESLint
npm run seed       # Seed the database
```

## Development

- The app uses TypeScript for type safety
- Database migrations are managed with Prisma
- UI components follow shadcn/ui patterns
- Styling is done with TailwindCSS v4

## Contributing

1. Create a feature branch
2. Make your changes
3. Run `npm run lint` to check code quality
4. Submit a pull request

## License

MIT
