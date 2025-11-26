# JAMBI Store

A premium e-commerce platform built with Next.js 14, TypeScript, and Tailwind CSS, featuring a modern dark-themed UI with glassmorphism effects.

## Features

- 🎮 **Modern Gaming Store Design**: Sleek dark theme with glassmorphism and smooth animations.
- 💳 **Multi-Currency Support**: Seamlessly handle IDR and USD transactions.
- 💸 **Multiple Payment Gateways**: Integrated with PayPal, Pakasir, iPaymu, and Tokopay.
- 🤖 **Discord Integration**: Automated support ticket creation and order notifications.
- 📱 **Responsive Layout**: Fully optimized for desktop and mobile devices.
- ⚡ **High Performance**: Built on Next.js 14 for speed and SEO optimization.
- 🔒 **Secure Authentication**: Firebase Authentication for user management.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Icons**: Lucide React
- **Animations**: Framer Motion

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Firebase project set up
- Discord Bot token (for bot features)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/masakowww/jambistore-app.git
   cd jambistore-app
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy `.env.example` to `.env` and fill in your credentials.

   ```bash
   cp .env.example .env
   ```

4. Run the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

### Payment Gateways

Configure your payment provider credentials in the `.env` file. The system supports:

- **PayPal** (USD)
- **Pakasir** (IDR)
- **iPaymu** (IDR)
- **Tokopay** (IDR)

### Discord Bot

To enable Discord features:

1. Create a Discord Application and Bot.
2. Invite the bot to your server.
3. Add the `DISCORD_BOT_TOKEN` and `GUILD_ID` to your `.env` file.

## Project Structure

```
├── app/                  # Next.js App Router pages
├── components/           # Reusable React components
│   ├── admin/            # Admin dashboard components
│   ├── ui/               # UI primitives
│   └── ...
├── lib/                  # Utility functions and configurations
│   ├── payments/         # Payment provider implementations
│   └── ...
├── public/               # Static assets
└── types/                # TypeScript type definitions
```

## License

[MIT](LICENSE)
