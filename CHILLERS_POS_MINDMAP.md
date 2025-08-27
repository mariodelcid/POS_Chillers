# 🧠 ChillersPOS Application Mindmap

## 📁 **PROJECT STRUCTURE**

### 🏗️ **Root Level**
```
ChillersPOS/
├── 📄 package.json (Dependencies & Scripts)
├── 📄 railway.json (Railway Deployment Config)
├── 📄 vite.config.js (Vite Build Config)
├── 📄 index.html (Main HTML Entry)
├── 📄 start.js (Database Setup & Server Start)
└── 📄 README.md (Project Documentation)
```

---

## 🗄️ **DATABASE LAYER (Prisma)**

### 📊 **Database Schema** (`prisma/schema.prisma`)
```
📦 DATABASE MODELS
├── 🏷️ Item
│   ├── id, name, category, priceCents
│   ├── stock, imageUrl, packaging
│   └── createdAt, updatedAt
│
├── 📦 PackagingMaterial
│   ├── id, name, stock
│   └── createdAt, updatedAt
│
├── 💰 Sale
│   ├── id, paymentMethod, totalCents
│   ├── subtotalCents, taxCents
│   ├── amountTenderedCents, changeDueCents
│   └── createdAt
│
├── 🛒 SaleItem
│   ├── id, saleId, itemId
│   ├── quantity, unitPriceCents, lineTotalCents
│   └── Relations: Sale, Item
│
├── 💸 Purchase
│   ├── id, amountCents, description
│   └── createdAt
│
└── ⏰ TimeEntry
    ├── id, employeeName, type
    ├── timestamp, createdAt, updatedAt
    └── type: 'clock_in' | 'clock_out'
```

### 🌱 **Database Seeding**
```
📦 SEED FILES
├── 📄 seed.js (Menu Items)
│   ├── SNACKS (Elote, Takis, Cheetos, etc.)
│   ├── CHAMOYADAS (4 varieties)
│   ├── REFRESHERS (7 varieties)
│   ├── MILK SHAKES (6 varieties)
│   └── BOBAS (5 varieties)
│
└── 📄 seed-packaging.js (Packaging Materials)
    ├── Inventory Items (24clear, 20clear, elote, etc.)
    ├── Item-to-Packaging Mapping
    └── Elote Inventory Tracking (ounces)
```

---

## 🖥️ **FRONTEND LAYER (React)**

### 🎯 **Main Entry Point** (`src/main.jsx`)
```
🚀 APPLICATION BOOTSTRAP
├── React Router Setup
├── Route Configuration
└── Component Rendering
```

### 🧭 **Routing Structure**
```
📱 ROUTES
├── / (POS - Main Interface)
├── /inventory (Inventory Management)
├── /sales (Sales Reports)
├── /hours (Employee Time Tracking)
└── /reports (PDF Report Generator)
```

### 🎨 **UI Components**

#### 🛒 **POS Interface** (`src/pages/POS.jsx`)
```
💳 POS SYSTEM
├── 🍽️ Menu Display
│   ├── Grouped by Categories
│   ├── Item Grid with Images
│   └── Add to Cart Functionality
│
├── 🛒 Shopping Cart
│   ├── Item List with Quantities
│   ├── Price Calculations
│   ├── Quantity Adjustments
│   └── Remove Items
│
├── 💰 Payment Processing
│   ├── Cash/Credit Selection
│   ├── Square Integration
│   │   ├── Android: Intent URLs
│   │   ├── iOS: Payment Links
│   │   └── Desktop: Web Checkout
│   ├── Amount Tendered
│   └── Change Calculation
│
├── 🎉 Celebration Overlay
│   ├── Sale Amount Display
│   └── 2-Second Animation
│
└── 👥 Employee Time Tracking
    ├── Clock In/Out Buttons
    ├── Employee Name Input
    └── API Integration
```

#### 📦 **Inventory Management** (`src/pages/Packaging.jsx`)
```
📦 INVENTORY SYSTEM
├── 📊 Stock Display
│   ├── Current Stock Levels
│   ├── Color-Coded Status
│   └── Elote Box Conversion
│
├── ✏️ Stock Editing
│   ├── Direct Input Fields
│   ├── Save/Cancel Actions
│   └── Real-time Updates
│
├── 📋 Packaging Materials
│   ├── 24clear, 20clear, 16clear
│   ├── Elote (480 oz/box)
│   ├── Snack Packaging
│   └── Ice Cream Cups
│
└── ℹ️ Usage Information
    ├── Automatic Deduction
    ├── Elote Ounce Tracking
    └── Low Stock Alerts
```

#### 📈 **Sales Reports** (`src/pages/Sales.jsx`)
```
📊 SALES ANALYTICS
├── 📅 Date Filtering
│   ├── Custom Date Range
│   ├── Quick Presets (Today, Yesterday, Week, Month)
│   ├── Timezone Handling
│   └── Real-time Filtering
│
├── 📋 Data Views
│   ├── Summary Tab
│   │   ├── Daily Totals
│   │   ├── Cash vs Credit
│   │   ├── Net Cash Flow
│   │   └── Transaction Counts
│   │
│   ├── Items Tab
│   │   ├── Top Selling Items
│   │   ├── Revenue by Item
│   │   ├── Quantity Sold
│   │   └── Category Breakdown
│   │
│   └── Transactions Tab
│       ├── Detailed Sales List
│       ├── Payment Methods
│       ├── Timestamps
│       └── Item Details
│
└── 📊 Summary Statistics
    ├── Total Sales Amount
    ├── Cash vs Credit Split
    ├── Purchase Deductions
    └── Net Cash Position
```

#### ⏰ **Employee Hours** (`src/pages/Hours.jsx`)
```
👥 TIME TRACKING
├── 👤 Employee Management
│   ├── Employee Selection
│   ├── Hourly Rate Setting
│   └── Individual Tracking
│
├── 📅 Time Views
│   ├── Payroll Summary
│   │   ├── Total Hours
│   │   ├── Pay Calculation
│   │   └── Employee Breakdown
│   │
│   ├── Daily View
│   │   ├── Clock In/Out Times
│   │   ├── Hours per Day
│   │   └── Daily Pay
│   │
│   ├── Weekly View
│   │   ├── Week Starting Sunday
│   │   ├── Daily Breakdown
│   │   ├── Weekly Totals
│   │   └── Weekly Pay
│   │
│   └── All Time Entries
│       ├── Complete History
│       ├── Filtering Options
│       └── Raw Data Display
│
└── ⏱️ Time Calculations
    ├── Hours Between Clock In/Out
    ├── Pay Rate Multiplication
    └── Overtime Handling
```

#### 📄 **PDF Reports** (`src/pages/PDFReport.jsx`)
```
📄 REPORT GENERATION
├── 📅 Date Selection
│   ├── Single Date Picker
│   └── Data Fetching
│
├── 📊 Report Content
│   ├── Sales Summary
│   │   ├── Total Sales
│   │   ├── Transaction Count
│   │   └── Date Display
│   │
│   ├── Sales Details Table
│   │   ├── Item Names
│   │   ├── Quantities Sold
│   │   ├── Revenue per Item
│   │   └── Grand Total
│   │
│   ├── Inventory Balance Table
│   │   ├── Packaging Materials
│   │   ├── Current Stock
│   │   └── Elote Box Conversion
│   │
│   └── Employee Hours Summary
│       ├── Employee Names
│       ├── Hours Worked
│       ├── Clock Ins/Outs
│       └── Pay Calculations
│
└── 🎨 PDF Formatting
    ├── Compact Layout
    ├── Custom Tables
    ├── Font Sizing
    └── Page Management
```

---

## 🔧 **BACKEND LAYER (Node.js/Express)**

### 🌐 **API Endpoints** (`server/index.js`)

#### 📦 **Inventory Management**
```
📦 PACKAGING API
├── GET /api/packaging
│   ├── Fetch All Packaging Materials
│   └── Return Stock Levels
│
└── PUT /api/packaging/:id
    ├── Update Stock Levels
    ├── Validation
    └── Database Update
```

#### 💰 **Sales Management**
```
💰 SALES API
├── GET /api/sales
│   ├── Fetch Sales History
│   ├── Date Filtering (startDate, endDate)
│   ├── Include Item Details
│   └── Order by Date Desc
│
├── POST /api/sales
│   ├── Create New Sale
│   ├── Validate Items & Stock
│   ├── Process Payment
│   ├── Update Inventory
│   ├── Elote Inventory Check
│   └── Packaging Deduction
│
└── GET /api/sales/stats
    ├── Sales Statistics
    ├── Date Range Filtering
    ├── Cash vs Credit Analysis
    ├── Top Selling Items
    └── Revenue Calculations
```

#### 💸 **Purchase Management**
```
💸 PURCHASES API
├── GET /api/purchases
│   ├── Fetch Purchase History
│   ├── Date Filtering
│   └── Order by Date Desc
│
└── POST /api/purchases
    ├── Create New Purchase
    ├── Amount & Description
    └── Database Storage
```

#### ⏰ **Time Tracking**
```
⏰ TIME ENTRIES API
├── GET /api/time-entries
│   ├── Fetch Time Entries
│   ├── Date Filtering
│   ├── Employee Filtering
│   └── Order by Timestamp
│
└── POST /api/time-entries
    ├── Create Clock In/Out
    ├── Employee Name
    ├── Entry Type
    └── Timestamp
```

#### 🍽️ **Menu Management**
```
🍽️ ITEMS API
├── GET /api/items
│   ├── Fetch All Menu Items
│   ├── Include Categories
│   ├── Stock Levels
│   └── Pricing Information
│
└── PUT /api/items/:id
    ├── Update Item Details
    ├── Stock Management
    └── Price Updates
```

---

## 🔄 **DATA FLOW**

### 🛒 **Sale Process Flow**
```
1. 📱 User Interface
   ├── Select Items
   ├── Add to Cart
   └── Choose Payment Method
│
2. 💳 Payment Processing
   ├── Cash: Calculate Change
   ├── Credit: Square Integration
   └── Validate Payment
│
3. 🗄️ Database Operations
   ├── Create Sale Record
   ├── Create Sale Items
   ├── Update Item Stock
   ├── Update Packaging Stock
   └── Elote Inventory Check
│
4. 🎉 User Feedback
   ├── Success Message
   ├── Celebration Overlay
   └── Cart Reset
```

### 📊 **Reporting Flow**
```
1. 📅 Date Selection
   ├── User Picks Date
   ├── Frontend Validation
   └── API Request
│
2. 🔍 Data Retrieval
   ├── Sales Data Fetch
   ├── Inventory Data Fetch
   ├── Hours Data Fetch
   └── Timezone Conversion
│
3. 📈 Data Processing
   ├── Aggregate Sales
   ├── Calculate Totals
   ├── Group by Items
   └── Employee Hours
│
4. 📄 Report Generation
   ├── PDF Creation
   ├── Table Formatting
   ├── Layout Design
   └── File Download
```

---

## 🔗 **INTEGRATIONS**

### 💳 **Square Payment Integration**
```
💳 SQUARE PAYMENT
├── 🏗️ Setup
│   ├── Application ID
│   ├── Access Token
│   ├── Location ID
│   └── API Version
│
├── 📱 Platform Handling
│   ├── Android: Intent URLs
│   ├── iOS: Payment Links
│   └── Desktop: Web Checkout
│
└── 🔄 Payment Flow
    ├── Amount Calculation
    ├── Platform Detection
    ├── Square App Launch
    └── Return to POS
```

### ☁️ **Railway Deployment**
```
🚀 RAILWAY DEPLOYMENT
├── 📦 Build Process
│   ├── Nixpacks Configuration
│   ├── Node.js Environment
│   └── Database Setup
│
├── 🗄️ Database Management
│   ├── PostgreSQL Database
│   ├── Prisma Migrations
│   └── Environment Variables
│
└── 🔄 Auto-Deployment
    ├── GitHub Integration
    ├── Automatic Builds
    └── Live Updates
```

---

## 🎯 **KEY FEATURES**

### 📱 **Core Functionality**
- ✅ Point of Sale Interface
- ✅ Inventory Management
- ✅ Sales Reporting
- ✅ Employee Time Tracking
- ✅ PDF Report Generation
- ✅ Square Payment Integration
- ✅ Date Filtering & Timezone Handling
- ✅ Real-time Stock Updates

### 🔧 **Technical Features**
- ✅ React Frontend
- ✅ Node.js Backend
- ✅ PostgreSQL Database
- ✅ Prisma ORM
- ✅ Railway Deployment
- ✅ Responsive Design
- ✅ Error Handling
- ✅ Data Validation

### 📊 **Business Features**
- ✅ Multi-category Menu
- ✅ Cash & Credit Payments
- ✅ Inventory Tracking
- ✅ Employee Management
- ✅ Sales Analytics
- ✅ Time & Attendance
- ✅ Automated Reports
- ✅ Stock Alerts

---

## 🚀 **DEPLOYMENT & MAINTENANCE**

### 📦 **Deployment Process**
```
1. 🖥️ Local Development
   ├── Code Changes
   ├── Testing
   └── Git Commit
│
2. 📤 GitHub Push
   ├── Push to Repository
   ├── Trigger Railway Build
   └── Automatic Deployment
│
3. ☁️ Railway Deployment
   ├── Build Application
   ├── Database Migrations
   ├── Environment Setup
   └── Live Deployment
```

### 🔧 **Maintenance Tasks**
```
🛠️ REGULAR MAINTENANCE
├── 📊 Database Management
│   ├── Backup Data
│   ├── Monitor Performance
│   └── Update Schema
│
├── 🔄 Code Updates
│   ├── Security Patches
│   ├── Feature Updates
│   └── Bug Fixes
│
└── 📈 Performance Monitoring
    ├── Response Times
    ├── Error Rates
    └── Resource Usage
```

---

*This mindmap provides a comprehensive overview of the ChillersPOS application architecture, helping you understand the relationships between different components and how data flows through the system.*
