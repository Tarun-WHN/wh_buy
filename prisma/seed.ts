import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================================
// PERMISSION KEYS (mirrors src/lib/permissions.ts)
// ============================================================

const PERMISSIONS = {
  LOCATION_MANAGE: "LOCATION_MANAGE",
  PRODUCT_MANAGE: "PRODUCT_MANAGE",
  VENDOR_MANAGE: "VENDOR_MANAGE",
  REQUIREMENT_CREATE: "REQUIREMENT_CREATE",
  REQUIREMENT_APPROVE: "REQUIREMENT_APPROVE",
  RFQ_CREATE: "RFQ_CREATE",
  RFQ_APPROVE: "RFQ_APPROVE",
  PO_CREATE: "PO_CREATE",
  PO_APPROVE: "PO_APPROVE",
  INVOICE_MANAGE: "INVOICE_MANAGE",
  PAYMENT_MANAGE: "PAYMENT_MANAGE",
  ANALYTICS_VIEW: "ANALYTICS_VIEW",
  USER_MANAGE: "USER_MANAGE",
  APPROVAL_RULES_MANAGE: "APPROVAL_RULES_MANAGE",
  DELIVERY_MANAGE: "DELIVERY_MANAGE",
  GRN_CREATE: "GRN_CREATE",
} as const;

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

// ============================================================
// ROLE DEFINITIONS
// ============================================================

const ROLE_DEFS = [
  {
    name: "SUPER_ADMIN",
    label: "Super Admin",
    permissions: ALL_PERMISSIONS,
  },
  {
    name: "PROCUREMENT_HEAD",
    label: "Procurement Head",
    permissions: [
      PERMISSIONS.LOCATION_MANAGE,
      PERMISSIONS.PRODUCT_MANAGE,
      PERMISSIONS.VENDOR_MANAGE,
      PERMISSIONS.REQUIREMENT_CREATE,
      PERMISSIONS.REQUIREMENT_APPROVE,
      PERMISSIONS.RFQ_CREATE,
      PERMISSIONS.RFQ_APPROVE,
      PERMISSIONS.PO_CREATE,
      PERMISSIONS.PO_APPROVE,
      PERMISSIONS.INVOICE_MANAGE,
      PERMISSIONS.ANALYTICS_VIEW,
      PERMISSIONS.APPROVAL_RULES_MANAGE,
      PERMISSIONS.DELIVERY_MANAGE,
      PERMISSIONS.GRN_CREATE,
    ],
  },
  {
    name: "PROCUREMENT_MANAGER",
    label: "Procurement Manager",
    permissions: [
      PERMISSIONS.PRODUCT_MANAGE,
      PERMISSIONS.VENDOR_MANAGE,
      PERMISSIONS.REQUIREMENT_CREATE,
      PERMISSIONS.REQUIREMENT_APPROVE,
      PERMISSIONS.RFQ_CREATE,
      PERMISSIONS.PO_CREATE,
      PERMISSIONS.INVOICE_MANAGE,
      PERMISSIONS.ANALYTICS_VIEW,
      PERMISSIONS.DELIVERY_MANAGE,
      PERMISSIONS.GRN_CREATE,
    ],
  },
  {
    name: "BUYER",
    label: "Buyer",
    permissions: [
      PERMISSIONS.REQUIREMENT_CREATE,
      PERMISSIONS.RFQ_CREATE,
      PERMISSIONS.PO_CREATE,
      PERMISSIONS.VENDOR_MANAGE,
      PERMISSIONS.DELIVERY_MANAGE,
      PERMISSIONS.GRN_CREATE,
    ],
  },
  {
    name: "ACCOUNTS",
    label: "Accounts Team",
    permissions: [
      PERMISSIONS.INVOICE_MANAGE,
      PERMISSIONS.PAYMENT_MANAGE,
      PERMISSIONS.ANALYTICS_VIEW,
    ],
  },
  {
    name: "OPERATIONS",
    label: "Operations Team",
    permissions: [
      PERMISSIONS.REQUIREMENT_CREATE,
      PERMISSIONS.DELIVERY_MANAGE,
      PERMISSIONS.GRN_CREATE,
    ],
  },
  {
    name: "VENDOR",
    label: "Vendor",
    permissions: [] as string[],
  },
];

// ============================================================
// MAIN SEED FUNCTION
// ============================================================

async function main() {
  console.log("🌱 Seeding database...\n");

  // ----------------------------------------------------------
  // 1. ROLES
  // ----------------------------------------------------------
  console.log("→ Creating roles...");
  const roles: Record<string, string> = {};
  for (const def of ROLE_DEFS) {
    const role = await prisma.role.upsert({
      where: { name: def.name },
      update: {
        label: def.label,
        permissions: JSON.stringify(def.permissions),
        isSystem: true,
      },
      create: {
        name: def.name,
        label: def.label,
        permissions: JSON.stringify(def.permissions),
        isSystem: true,
      },
    });
    roles[def.name] = role.id;
  }
  console.log(`  ✓ ${Object.keys(roles).length} roles created\n`);

  // ----------------------------------------------------------
  // 2. COMPANY & LOCATION HIERARCHY
  // ----------------------------------------------------------
  console.log("→ Creating company & locations...");

  const company = await prisma.company.upsert({
    where: { code: "WHNOW" },
    update: { name: "Warehouse Now Pvt Ltd" },
    create: {
      name: "Warehouse Now Pvt Ltd",
      code: "WHNOW",
      address: "123 Business Park, Bangalore, Karnataka 560001",
    },
  });

  // Regions
  const regionSouth = await prisma.region.upsert({
    where: { companyId_code: { companyId: company.id, code: "SOUTH" } },
    update: { name: "South India" },
    create: { name: "South India", code: "SOUTH", companyId: company.id },
  });
  const regionWest = await prisma.region.upsert({
    where: { companyId_code: { companyId: company.id, code: "WEST" } },
    update: { name: "West India" },
    create: { name: "West India", code: "WEST", companyId: company.id },
  });
  const regionNorth = await prisma.region.upsert({
    where: { companyId_code: { companyId: company.id, code: "NORTH" } },
    update: { name: "North India" },
    create: { name: "North India", code: "NORTH", companyId: company.id },
  });

  // States
  const stateKA = await prisma.state.upsert({
    where: { regionId_code: { regionId: regionSouth.id, code: "KA" } },
    update: { name: "Karnataka" },
    create: { name: "Karnataka", code: "KA", regionId: regionSouth.id },
  });
  const stateMH = await prisma.state.upsert({
    where: { regionId_code: { regionId: regionWest.id, code: "MH" } },
    update: { name: "Maharashtra" },
    create: { name: "Maharashtra", code: "MH", regionId: regionWest.id },
  });
  const stateDL = await prisma.state.upsert({
    where: { regionId_code: { regionId: regionNorth.id, code: "DL" } },
    update: { name: "Delhi" },
    create: { name: "Delhi", code: "DL", regionId: regionNorth.id },
  });

  // Cities
  const cityBLR = await prisma.city.upsert({
    where: { stateId_code: { stateId: stateKA.id, code: "BLR" } },
    update: { name: "Bangalore" },
    create: { name: "Bangalore", code: "BLR", stateId: stateKA.id },
  });
  const cityPUN = await prisma.city.upsert({
    where: { stateId_code: { stateId: stateMH.id, code: "PUN" } },
    update: { name: "Pune" },
    create: { name: "Pune", code: "PUN", stateId: stateMH.id },
  });
  const cityDEL = await prisma.city.upsert({
    where: { stateId_code: { stateId: stateDL.id, code: "DEL" } },
    update: { name: "New Delhi" },
    create: { name: "New Delhi", code: "DEL", stateId: stateDL.id },
  });

  // Warehouses
  const whBLR01 = await prisma.warehouse.upsert({
    where: { code: "WH-BLR-01" },
    update: { name: "Whitefield Warehouse" },
    create: {
      name: "Whitefield Warehouse",
      code: "WH-BLR-01",
      address: "Survey No. 45, Whitefield Main Road, Bangalore 560066",
      cityId: cityBLR.id,
    },
  });
  const whBLR02 = await prisma.warehouse.upsert({
    where: { code: "WH-BLR-02" },
    update: { name: "Electronic City Warehouse" },
    create: {
      name: "Electronic City Warehouse",
      code: "WH-BLR-02",
      address: "Plot 78, Electronic City Phase 2, Bangalore 560100",
      cityId: cityBLR.id,
    },
  });
  await prisma.warehouse.upsert({
    where: { code: "WH-PUN-01" },
    update: { name: "Chakan Warehouse" },
    create: {
      name: "Chakan Warehouse",
      code: "WH-PUN-01",
      address: "Gut No 123, MIDC Chakan, Pune 410501",
      cityId: cityPUN.id,
    },
  });
  await prisma.warehouse.upsert({
    where: { code: "WH-DEL-01" },
    update: { name: "Narela Warehouse" },
    create: {
      name: "Narela Warehouse",
      code: "WH-DEL-01",
      address: "Plot A-12, Narela Industrial Area, New Delhi 110040",
      cityId: cityDEL.id,
    },
  });

  console.log("  ✓ Company, regions, states, cities, warehouses created\n");

  // ----------------------------------------------------------
  // 3. CATEGORIES, SUBCATEGORIES & PRODUCT GROUPS
  // ----------------------------------------------------------
  console.log("→ Creating categories...");

  interface CategoryDef {
    name: string;
    code: string;
    subcategories: { name: string; code: string; groups: { name: string; code: string }[] }[];
  }

  const categoryDefs: CategoryDef[] = [
    {
      name: "Racks",
      code: "RACKS",
      subcategories: [
        { name: "Slotted Angle Racks", code: "SAR", groups: [{ name: "Standard Slotted Racks", code: "STD-SAR" }] },
        { name: "Heavy Duty Racks", code: "HDR", groups: [{ name: "Industrial Heavy Racks", code: "IND-HDR" }] },
        { name: "Pallet Racks", code: "PLR", groups: [{ name: "Selective Pallet Racks", code: "SEL-PLR" }] },
      ],
    },
    {
      name: "Packaging Materials",
      code: "PKG",
      subcategories: [
        { name: "Boxes", code: "BOX", groups: [{ name: "Corrugated Boxes", code: "COR-BOX" }] },
        { name: "Tapes", code: "TPE", groups: [{ name: "Packaging Tapes", code: "PKG-TPE" }] },
        { name: "Stretch Films", code: "SFL", groups: [{ name: "Pallet Stretch Films", code: "PLT-SFL" }] },
      ],
    },
    {
      name: "Safety Equipment",
      code: "SAFETY",
      subcategories: [
        { name: "PPE", code: "PPE", groups: [{ name: "Personal Protective Equipment", code: "PPE-GEN" }] },
        { name: "Fire Safety", code: "FSE", groups: [{ name: "Fire Extinguishers & Equipment", code: "FE-EQP" }] },
        { name: "First Aid", code: "FAD", groups: [{ name: "First Aid Kits & Supplies", code: "FA-KIT" }] },
      ],
    },
    {
      name: "Cleaning Supplies",
      code: "CLEAN",
      subcategories: [
        { name: "Floor Cleaning", code: "FLC", groups: [{ name: "Floor Cleaning Equipment", code: "FL-EQP" }] },
        { name: "Sanitization", code: "SAN", groups: [{ name: "Sanitization Products", code: "SAN-PRD" }] },
        { name: "Waste Management", code: "WST", groups: [{ name: "Bins & Waste Disposal", code: "BIN-WST" }] },
      ],
    },
    {
      name: "Office Supplies",
      code: "OFFICE",
      subcategories: [
        { name: "Stationery", code: "STN", groups: [{ name: "General Stationery", code: "GEN-STN" }] },
        { name: "Printing", code: "PRT", groups: [{ name: "Printing Supplies", code: "PRT-SUP" }] },
        { name: "IT Accessories", code: "ITA", groups: [{ name: "Computer Accessories", code: "CMP-ACC" }] },
      ],
    },
    {
      name: "Electrical",
      code: "ELEC",
      subcategories: [
        { name: "Lighting", code: "LGT", groups: [{ name: "LED & Industrial Lighting", code: "LED-LGT" }] },
        { name: "Wiring", code: "WRG", groups: [{ name: "Cables & Wiring", code: "CBL-WRG" }] },
        { name: "Switches", code: "SWT", groups: [{ name: "Switches & Sockets", code: "SW-SKT" }] },
      ],
    },
    {
      name: "Material Handling",
      code: "MH",
      subcategories: [
        { name: "Trolleys", code: "TRL", groups: [{ name: "Platform & Cage Trolleys", code: "PLT-TRL" }] },
        { name: "Hand Pallet Trucks", code: "HPT", groups: [{ name: "Manual Pallet Trucks", code: "MAN-HPT" }] },
        { name: "Conveyors", code: "CNV", groups: [{ name: "Roller Conveyors", code: "RLR-CNV" }] },
      ],
    },
    {
      name: "Furniture",
      code: "FURN",
      subcategories: [
        { name: "Tables", code: "TBL", groups: [{ name: "Work & Office Tables", code: "WRK-TBL" }] },
        { name: "Chairs", code: "CHR", groups: [{ name: "Office & Industrial Chairs", code: "OFC-CHR" }] },
        { name: "Storage Cabinets", code: "CAB", groups: [{ name: "Metal Storage Cabinets", code: "MTL-CAB" }] },
      ],
    },
    {
      name: "CCTV & Security",
      code: "CCTV",
      subcategories: [
        { name: "Cameras", code: "CAM", groups: [{ name: "IP & Dome Cameras", code: "IP-CAM" }] },
        { name: "DVR/NVR", code: "DVR", groups: [{ name: "Video Recorders", code: "VID-REC" }] },
        { name: "Access Control", code: "ACC", groups: [{ name: "Biometric & Card Access", code: "BIO-ACC" }] },
      ],
    },
    {
      name: "Tools & Hardware",
      code: "TOOLS",
      subcategories: [
        { name: "Hand Tools", code: "HND", groups: [{ name: "General Hand Tools", code: "GEN-HND" }] },
        { name: "Power Tools", code: "PWR", groups: [{ name: "Electric Power Tools", code: "ELC-PWR" }] },
        { name: "Fasteners", code: "FST", groups: [{ name: "Nuts, Bolts & Screws", code: "NBS-FST" }] },
      ],
    },
  ];

  // Store category IDs and product group IDs for product creation
  const categoryIds: Record<string, string> = {};
  const productGroupIds: Record<string, string> = {};

  for (const catDef of categoryDefs) {
    const category = await prisma.category.upsert({
      where: { code: catDef.code },
      update: { name: catDef.name },
      create: { name: catDef.name, code: catDef.code },
    });
    categoryIds[catDef.code] = category.id;

    for (const subDef of catDef.subcategories) {
      const subcategory = await prisma.subcategory.upsert({
        where: { categoryId_code: { categoryId: category.id, code: subDef.code } },
        update: { name: subDef.name },
        create: { name: subDef.name, code: subDef.code, categoryId: category.id },
      });

      for (const grpDef of subDef.groups) {
        const group = await prisma.productGroup.upsert({
          where: { subcategoryId_code: { subcategoryId: subcategory.id, code: grpDef.code } },
          update: { name: grpDef.name },
          create: { name: grpDef.name, code: grpDef.code, subcategoryId: subcategory.id },
        });
        productGroupIds[grpDef.code] = group.id;
      }
    }
  }

  console.log(`  ✓ ${categoryDefs.length} categories with subcategories and product groups\n`);

  // ----------------------------------------------------------
  // 4. PRODUCTS (30+ across categories)
  // ----------------------------------------------------------
  console.log("→ Creating products...");

  interface ProductDef {
    name: string;
    sku: string;
    uom: string;
    hsnCode: string;
    gstPercent: number;
    description: string;
    groupCode: string;
  }

  const productDefs: ProductDef[] = [
    // Racks
    { name: "Slotted Angle Rack 6x3x1.5ft", sku: "RAK-SAR-001", uom: "Nos", hsnCode: "9403", gstPercent: 18, description: "6-shelf slotted angle rack, powder coated", groupCode: "STD-SAR" },
    { name: "Slotted Angle Rack 7x3x1.5ft", sku: "RAK-SAR-002", uom: "Nos", hsnCode: "9403", gstPercent: 18, description: "7-shelf slotted angle rack, powder coated", groupCode: "STD-SAR" },
    { name: "Heavy Duty Rack 8x4x2ft", sku: "RAK-HDR-001", uom: "Nos", hsnCode: "9403", gstPercent: 18, description: "500kg/shelf capacity heavy duty rack", groupCode: "IND-HDR" },
    { name: "Selective Pallet Rack 12ft", sku: "RAK-PLR-001", uom: "Set", hsnCode: "9403", gstPercent: 18, description: "3-level selective pallet racking system", groupCode: "SEL-PLR" },

    // Packaging Materials
    { name: "Corrugated Box 18x12x10 (3-ply)", sku: "PKG-BOX-001", uom: "Box", hsnCode: "4819", gstPercent: 18, description: "3-ply corrugated box, brown kraft", groupCode: "COR-BOX" },
    { name: "Corrugated Box 24x18x12 (5-ply)", sku: "PKG-BOX-002", uom: "Box", hsnCode: "4819", gstPercent: 18, description: "5-ply heavy duty corrugated box", groupCode: "COR-BOX" },
    { name: "BOPP Tape 48mm x 65m (Brown)", sku: "PKG-TPE-001", uom: "Nos", hsnCode: "3919", gstPercent: 18, description: "Brown BOPP packaging tape", groupCode: "PKG-TPE" },
    { name: "Stretch Film 500mm x 300m", sku: "PKG-SFL-001", uom: "Nos", hsnCode: "3920", gstPercent: 18, description: "23 micron hand stretch wrap film", groupCode: "PLT-SFL" },

    // Safety Equipment
    { name: "Safety Helmet (White)", sku: "SAF-PPE-001", uom: "Nos", hsnCode: "6506", gstPercent: 18, description: "ISI marked industrial safety helmet", groupCode: "PPE-GEN" },
    { name: "Safety Shoes (Size 8)", sku: "SAF-PPE-002", uom: "Pair", hsnCode: "6401", gstPercent: 18, description: "Steel toe safety shoes, anti-slip sole", groupCode: "PPE-GEN" },
    { name: "Fire Extinguisher ABC 4kg", sku: "SAF-FSE-001", uom: "Nos", hsnCode: "8424", gstPercent: 18, description: "ABC dry powder fire extinguisher 4kg", groupCode: "FE-EQP" },
    { name: "First Aid Kit (50 person)", sku: "SAF-FAD-001", uom: "Nos", hsnCode: "3006", gstPercent: 12, description: "Industrial first aid kit for 50 persons", groupCode: "FA-KIT" },

    // Cleaning Supplies
    { name: "Floor Mop Set (Industrial)", sku: "CLN-FLC-001", uom: "Set", hsnCode: "9603", gstPercent: 18, description: "Industrial grade cotton floor mop set", groupCode: "FL-EQP" },
    { name: "Hand Sanitizer 5L", sku: "CLN-SAN-001", uom: "Nos", hsnCode: "3401", gstPercent: 18, description: "Alcohol-based hand sanitizer 5 litre", groupCode: "SAN-PRD" },
    { name: "Dustbin 120L (Wheeled)", sku: "CLN-WST-001", uom: "Nos", hsnCode: "3926", gstPercent: 18, description: "120 litre wheeled waste bin with lid", groupCode: "BIN-WST" },

    // Office Supplies
    { name: "A4 Copier Paper (500 sheets)", sku: "OFC-STN-001", uom: "Nos", hsnCode: "4802", gstPercent: 12, description: "75 GSM A4 copier paper ream", groupCode: "GEN-STN" },
    { name: "Printer Toner HP 12A", sku: "OFC-PRT-001", uom: "Nos", hsnCode: "3707", gstPercent: 18, description: "HP 12A compatible toner cartridge", groupCode: "PRT-SUP" },
    { name: "USB Mouse (Wired)", sku: "OFC-ITA-001", uom: "Nos", hsnCode: "8471", gstPercent: 18, description: "Optical wired USB mouse", groupCode: "CMP-ACC" },

    // Electrical
    { name: "LED Tube Light 4ft 20W", sku: "ELC-LGT-001", uom: "Nos", hsnCode: "9405", gstPercent: 18, description: "20W LED tube light, cool daylight", groupCode: "LED-LGT" },
    { name: "LED High Bay 100W", sku: "ELC-LGT-002", uom: "Nos", hsnCode: "9405", gstPercent: 18, description: "100W LED high bay light for warehouse", groupCode: "LED-LGT" },
    { name: "Electrical Cable 2.5mm (100m)", sku: "ELC-WRG-001", uom: "Nos", hsnCode: "8544", gstPercent: 18, description: "2.5 sq mm copper electrical cable 100m coil", groupCode: "CBL-WRG" },

    // Material Handling
    { name: "Platform Trolley 300kg", sku: "MH-TRL-001", uom: "Nos", hsnCode: "8716", gstPercent: 18, description: "300kg capacity steel platform trolley", groupCode: "PLT-TRL" },
    { name: "Hand Pallet Truck 2.5T", sku: "MH-HPT-001", uom: "Nos", hsnCode: "8427", gstPercent: 18, description: "2.5 ton manual hydraulic pallet truck", groupCode: "MAN-HPT" },
    { name: "Gravity Roller Conveyor 10ft", sku: "MH-CNV-001", uom: "Nos", hsnCode: "8428", gstPercent: 18, description: "10ft gravity roller conveyor section", groupCode: "RLR-CNV" },

    // Furniture
    { name: "Office Table 5x2.5ft", sku: "FRN-TBL-001", uom: "Nos", hsnCode: "9403", gstPercent: 18, description: "Laminated office table with drawers", groupCode: "WRK-TBL" },
    { name: "Revolving Office Chair", sku: "FRN-CHR-001", uom: "Nos", hsnCode: "9401", gstPercent: 18, description: "Ergonomic revolving office chair with armrest", groupCode: "OFC-CHR" },
    { name: "Metal Almirah 6x3x1.5ft", sku: "FRN-CAB-001", uom: "Nos", hsnCode: "9403", gstPercent: 18, description: "2-door steel storage almirah", groupCode: "MTL-CAB" },

    // CCTV & Security
    { name: "IP Dome Camera 2MP", sku: "CTV-CAM-001", uom: "Nos", hsnCode: "8525", gstPercent: 18, description: "2MP IP dome camera with night vision", groupCode: "IP-CAM" },
    { name: "NVR 16 Channel", sku: "CTV-DVR-001", uom: "Nos", hsnCode: "8521", gstPercent: 18, description: "16-channel network video recorder 4TB", groupCode: "VID-REC" },
    { name: "Biometric Attendance System", sku: "CTV-ACC-001", uom: "Nos", hsnCode: "8543", gstPercent: 18, description: "Fingerprint & face recognition attendance system", groupCode: "BIO-ACC" },

    // Tools & Hardware
    { name: "Tool Kit 35-piece", sku: "TLS-HND-001", uom: "Set", hsnCode: "8206", gstPercent: 18, description: "35-piece hand tool kit with case", groupCode: "GEN-HND" },
    { name: "Cordless Drill 12V", sku: "TLS-PWR-001", uom: "Nos", hsnCode: "8467", gstPercent: 18, description: "12V lithium-ion cordless drill machine", groupCode: "ELC-PWR" },
    { name: "Hex Bolt M10x50 (Box of 100)", sku: "TLS-FST-001", uom: "Box", hsnCode: "7318", gstPercent: 18, description: "M10x50mm hex bolt, grade 8.8, box of 100", groupCode: "NBS-FST" },
    { name: "Self Drilling Screw 8x1 (Box of 500)", sku: "TLS-FST-002", uom: "Box", hsnCode: "7318", gstPercent: 18, description: "Self drilling screws 8x1 inch, box of 500", groupCode: "NBS-FST" },
  ];

  const productIds: Record<string, string> = {};
  for (const pDef of productDefs) {
    const product = await prisma.product.upsert({
      where: { sku: pDef.sku },
      update: {
        name: pDef.name,
        uom: pDef.uom,
        hsnCode: pDef.hsnCode,
        gstPercent: pDef.gstPercent,
        description: pDef.description,
      },
      create: {
        name: pDef.name,
        sku: pDef.sku,
        uom: pDef.uom,
        hsnCode: pDef.hsnCode,
        gstPercent: pDef.gstPercent,
        description: pDef.description,
        productGroupId: productGroupIds[pDef.groupCode],
      },
    });
    productIds[pDef.sku] = product.id;
  }

  console.log(`  ✓ ${productDefs.length} products created\n`);

  // ----------------------------------------------------------
  // 5. VENDORS
  // ----------------------------------------------------------
  console.log("→ Creating vendors...");

  interface VendorDef {
    name: string;
    code: string;
    legalName: string;
    gstNumber: string;
    panNumber: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    bankName: string;
    bankAccountNumber: string;
    bankIfsc: string;
    paymentTerms: string;
    leadTimeDays: number;
    categories: string[];
  }

  const vendorDefs: VendorDef[] = [
    {
      name: "Godrej Interio",
      code: "VND-001",
      legalName: "Godrej & Boyce Mfg Co Ltd",
      gstNumber: "27AAACG1395D1ZP",
      panNumber: "AAACG1395D",
      contactPerson: "Rajesh Kumar",
      email: "sales@godrejinterio.com",
      phone: "9876543210",
      address: "Plant 13, Vikhroli, Mumbai",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400079",
      bankName: "State Bank of India",
      bankAccountNumber: "31023456789",
      bankIfsc: "SBIN0000300",
      paymentTerms: "Net 30",
      leadTimeDays: 15,
      categories: ["RACKS", "FURN"],
    },
    {
      name: "SafeGuard Supplies",
      code: "VND-002",
      legalName: "SafeGuard Industrial Supplies Pvt Ltd",
      gstNumber: "29AABCS5678F1ZQ",
      panNumber: "AABCS5678F",
      contactPerson: "Priya Sharma",
      email: "orders@safeguardsupplies.com",
      phone: "9876543211",
      address: "45 Industrial Area, Peenya, Bangalore",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560058",
      bankName: "HDFC Bank",
      bankAccountNumber: "50100123456789",
      bankIfsc: "HDFC0001234",
      paymentTerms: "Net 15",
      leadTimeDays: 7,
      categories: ["SAFETY", "CLEAN"],
    },
    {
      name: "TechPack Solutions",
      code: "VND-003",
      legalName: "TechPack Packaging Solutions LLP",
      gstNumber: "29AABFT9012G1ZR",
      panNumber: "AABFT9012G",
      contactPerson: "Anil Mehta",
      email: "info@techpacksolutions.in",
      phone: "9876543212",
      address: "Plot 12, Bommasandra Industrial Area, Bangalore",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560099",
      bankName: "ICICI Bank",
      bankAccountNumber: "123405001234",
      bankIfsc: "ICIC0001234",
      paymentTerms: "Net 21",
      leadTimeDays: 5,
      categories: ["PKG"],
    },
    {
      name: "ElectroPower India",
      code: "VND-004",
      legalName: "ElectroPower India Pvt Ltd",
      gstNumber: "07AABCE3456H1ZS",
      panNumber: "AABCE3456H",
      contactPerson: "Vikram Singh",
      email: "sales@electropowerindia.com",
      phone: "9876543213",
      address: "B-21 Okhla Industrial Estate, New Delhi",
      city: "New Delhi",
      state: "Delhi",
      pincode: "110020",
      bankName: "Axis Bank",
      bankAccountNumber: "917020012345678",
      bankIfsc: "UTIB0001234",
      paymentTerms: "Net 30",
      leadTimeDays: 10,
      categories: ["ELEC", "CCTV"],
    },
    {
      name: "ToolMaster Hardware",
      code: "VND-005",
      legalName: "ToolMaster Hardware & Equipments",
      gstNumber: "27AABCT7890J1ZT",
      panNumber: "AABCT7890J",
      contactPerson: "Sunil Patil",
      email: "contact@toolmasterhw.com",
      phone: "9876543214",
      address: "Shop 5, Hardware Market, Chinchwad, Pune",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411019",
      bankName: "Bank of Baroda",
      bankAccountNumber: "12340100012345",
      bankIfsc: "BARB0CHINCH",
      paymentTerms: "Net 15",
      leadTimeDays: 7,
      categories: ["TOOLS", "MH"],
    },
  ];

  const vendorIds: Record<string, string> = {};
  for (const vDef of vendorDefs) {
    const vendor = await prisma.vendor.upsert({
      where: { code: vDef.code },
      update: {
        name: vDef.name,
        legalName: vDef.legalName,
        contactPerson: vDef.contactPerson,
        email: vDef.email,
        phone: vDef.phone,
      },
      create: {
        name: vDef.name,
        code: vDef.code,
        legalName: vDef.legalName,
        gstNumber: vDef.gstNumber,
        panNumber: vDef.panNumber,
        contactPerson: vDef.contactPerson,
        email: vDef.email,
        phone: vDef.phone,
        address: vDef.address,
        city: vDef.city,
        state: vDef.state,
        pincode: vDef.pincode,
        bankName: vDef.bankName,
        bankAccountNumber: vDef.bankAccountNumber,
        bankIfsc: vDef.bankIfsc,
        paymentTerms: vDef.paymentTerms,
        leadTimeDays: vDef.leadTimeDays,
        registrationStatus: "APPROVED",
        rating: 4.0,
      },
    });
    vendorIds[vDef.code] = vendor.id;

    // Create vendor-category links
    for (const catCode of vDef.categories) {
      const catId = categoryIds[catCode];
      if (catId) {
        await prisma.vendorCategory.upsert({
          where: { vendorId_categoryId: { vendorId: vendor.id, categoryId: catId } },
          update: {},
          create: { vendorId: vendor.id, categoryId: catId },
        });
      }
    }
  }

  console.log(`  ✓ ${vendorDefs.length} vendors created with category links\n`);

  // ----------------------------------------------------------
  // 6. USERS
  // ----------------------------------------------------------
  console.log("→ Creating users...");

  const adminHash = await bcrypt.hash("admin123", 10);
  const userHash = await bcrypt.hash("password123", 10);

  // Super Admin
  await prisma.user.upsert({
    where: { email: "admin@warehousenow.com" },
    update: { passwordHash: adminHash },
    create: {
      email: "admin@warehousenow.com",
      name: "Admin User",
      passwordHash: adminHash,
      phone: "9900000001",
      roleId: roles["SUPER_ADMIN"],
      warehouseId: whBLR01.id,
    },
  });

  // Role-based users
  interface UserDef {
    email: string;
    name: string;
    role: string;
    phone: string;
  }

  const userDefs: UserDef[] = [
    { email: "proc.head@warehousenow.com", name: "Ramesh Iyer", role: "PROCUREMENT_HEAD", phone: "9900000002" },
    { email: "proc.manager@warehousenow.com", name: "Suresh Nair", role: "PROCUREMENT_MANAGER", phone: "9900000003" },
    { email: "buyer@warehousenow.com", name: "Anjali Desai", role: "BUYER", phone: "9900000004" },
    { email: "accounts@warehousenow.com", name: "Kavitha Rao", role: "ACCOUNTS", phone: "9900000005" },
    { email: "operations@warehousenow.com", name: "Manoj Kumar", role: "OPERATIONS", phone: "9900000006" },
  ];

  for (const uDef of userDefs) {
    await prisma.user.upsert({
      where: { email: uDef.email },
      update: { passwordHash: userHash },
      create: {
        email: uDef.email,
        name: uDef.name,
        passwordHash: userHash,
        phone: uDef.phone,
        roleId: roles[uDef.role],
        warehouseId: whBLR01.id,
      },
    });
  }

  // Vendor user
  const vendorUser = await prisma.user.upsert({
    where: { email: "vendor1@godrej.com" },
    update: { passwordHash: userHash },
    create: {
      email: "vendor1@godrej.com",
      name: "Rajesh Kumar",
      passwordHash: userHash,
      phone: "9876543210",
      roleId: roles["VENDOR"],
    },
  });

  // Link vendor user to Godrej Interio
  await prisma.vendorUser.upsert({
    where: { userId: vendorUser.id },
    update: { vendorId: vendorIds["VND-001"] },
    create: {
      userId: vendorUser.id,
      vendorId: vendorIds["VND-001"],
    },
  });

  console.log("  ✓ 7 users created (1 admin + 5 role-based + 1 vendor)\n");

  // ----------------------------------------------------------
  // 7. APPROVAL RULES (PO entity)
  // ----------------------------------------------------------
  console.log("→ Creating approval rules...");

  // Delete existing PO approval rules to re-create cleanly
  await prisma.approvalRule.deleteMany({ where: { entity: "PO" } });

  // < 50,000: Level 1 = PROCUREMENT_MANAGER
  await prisma.approvalRule.create({
    data: {
      name: "PO < 50K - Manager Approval",
      entity: "PO",
      minAmount: 0,
      maxAmount: 50000,
      approverRoleId: roles["PROCUREMENT_MANAGER"],
      level: 1,
    },
  });

  // 50,000 - 500,000: Level 1 = PROCUREMENT_MANAGER, Level 2 = PROCUREMENT_HEAD
  await prisma.approvalRule.create({
    data: {
      name: "PO 50K-5L - Manager Approval",
      entity: "PO",
      minAmount: 50000,
      maxAmount: 500000,
      approverRoleId: roles["PROCUREMENT_MANAGER"],
      level: 1,
    },
  });
  await prisma.approvalRule.create({
    data: {
      name: "PO 50K-5L - Head Approval",
      entity: "PO",
      minAmount: 50000,
      maxAmount: 500000,
      approverRoleId: roles["PROCUREMENT_HEAD"],
      level: 2,
    },
  });

  // > 500,000: Level 1 = PROCUREMENT_MANAGER, Level 2 = PROCUREMENT_HEAD, Level 3 = SUPER_ADMIN
  await prisma.approvalRule.create({
    data: {
      name: "PO > 5L - Manager Approval",
      entity: "PO",
      minAmount: 500000,
      maxAmount: null,
      approverRoleId: roles["PROCUREMENT_MANAGER"],
      level: 1,
    },
  });
  await prisma.approvalRule.create({
    data: {
      name: "PO > 5L - Head Approval",
      entity: "PO",
      minAmount: 500000,
      maxAmount: null,
      approverRoleId: roles["PROCUREMENT_HEAD"],
      level: 2,
    },
  });
  await prisma.approvalRule.create({
    data: {
      name: "PO > 5L - Super Admin Approval",
      entity: "PO",
      minAmount: 500000,
      maxAmount: null,
      approverRoleId: roles["SUPER_ADMIN"],
      level: 3,
    },
  });

  console.log("  ✓ 6 approval rules created for PO entity\n");

  // ----------------------------------------------------------
  // 8. SEQUENCE COUNTERS
  // ----------------------------------------------------------
  console.log("→ Initializing sequence counters...");

  const currentYear = new Date().getFullYear();
  const sequences = [
    { entity: "REQUIREMENT", prefix: "REQ" },
    { entity: "RFQ", prefix: "RFQ" },
    { entity: "QUOTATION", prefix: "QOT" },
    { entity: "PO", prefix: "PO" },
    { entity: "DELIVERY", prefix: "DLV" },
    { entity: "GRN", prefix: "GRN" },
    { entity: "INVOICE", prefix: "INV" },
  ];

  for (const seq of sequences) {
    await prisma.sequenceCounter.upsert({
      where: { entity_year: { entity: seq.entity, year: currentYear } },
      update: {},
      create: {
        entity: seq.entity,
        prefix: seq.prefix,
        year: currentYear,
        lastValue: 0,
      },
    });
  }

  console.log(`  ✓ ${sequences.length} sequence counters initialized for year ${currentYear}\n`);

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
