# Product Import Script

This script imports product data from JSON files into Firestore.

## 📋 Prerequisites

1. **Firebase Service Account**: Download `firebase-service-account.json` from Firebase Console
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the file in project root

2. **Environment Variables**: Ensure `.env` has:
   ```env
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
   ```

## 🚀 Usage

### Run the import script:
```bash
node scripts/importProducts.mjs
```

### What it does:
1. Reads all `.json` files from `data/products/`
2. For each product:
   - Checks if product with same `slug` exists
   - **If exists**: Updates the product (merge) and increments version
   - **If new**: Creates new product with `createdAt` timestamp
3. Prints summary: `✅ Created N, 🔄 Updated M, ❌ Errors K`

## 📦 Product Data Files

Product JSON files are located in `data/products/`:
- `fortnite.json` - Fortnite cheat
- `freefire.json` - Free Fire cheat
- `fivem.json` - FiveM menu
- `squad.json` - Squad cheat

## 📝 Product JSON Structure

Each product must match the `Product` interface from `types/product.ts`:

```json
{
  "slug": "product-slug",
  "title": "Product Name",
  "subtitle": "Short description",
  "description": "Full description",
  "heroImageUrl": "/img/product.png",
  "category": "category-name",
  "status": "ACTIVE",
  "systemRequirements": [
    { "icon": "cpu", "label": "CPU requirement" }
  ],
  "plans": [
    {
      "id": "plan-id",
      "name": "Plan Name",
      "priceString": "$10",
      "priceNumber": 10,
      "period": "/day",
      "popular": false
    }
  ],
  "features": [
    {
      "id": "feature-id",
      "title": "Feature Title",
      "description": "Feature description",
      "items": ["Item 1", "Item 2"]
    }
  ],
  "flags": {
    "isPublic": true,
    "isUpdating": false
  }
}
```

## ✅ Required Fields

- `slug` (string, pattern: `^[a-z0-9-]+$`)
- `title` (string)
- `plans` (array, minimum 1 plan)

## 🔄 Update vs Create

- **Existing product** (same slug): Updates all fields, increments `meta.version`
- **New product**: Creates with `meta.createdAt`, `meta.updatedAt`, `meta.version = 1`

## 📊 Example Output

```
🚀 Starting product import...

📦 Found 4 product file(s)

Processing: fortnite.json
   ✅ Created: fortnite-cheat (ID: abc123)

Processing: freefire.json
   ✅ Created: freefire-cheat (ID: def456)

Processing: fivem.json
   ✅ Updated: fivem-cheat (ID: ghi789)

Processing: squad.json
   ✅ Created: squad-cheat (ID: jkl012)

==================================================
📊 Import Summary:
==================================================
✅ Created: 3
🔄 Updated: 1
⏭️  Skipped: 0
❌ Errors:  0
==================================================

🎉 Import completed successfully!
```

## 🛠️ Adding New Products

1. Create a new JSON file in `data/products/`
2. Follow the structure above
3. Run `node scripts/importProducts.mjs`
4. Product will be available at `/products/[slug]`

## ⚠️ Important Notes

- **Slug must be unique** - Script will update if slug already exists
- **At least one plan required** - Script will error if plans array is empty
- **All price fields required** - Both `priceString` and `priceNumber` needed
- **Validation** - Script validates required fields before import

## 🔗 Related Files

- Product types: `types/product.ts`
- Dynamic product page: `app/products/[slug]/page.tsx`
- Product API: `app/api/products/`
- Admin UI: `app/admin/products/`

## 🐛 Troubleshooting

### Error: "Cannot find module 'firebase-admin'"
```bash
npm install
```

### Error: "ENOENT: no such file or directory"
Make sure `firebase-service-account.json` exists in project root.

### Error: "Missing required field: slug"
Check your JSON file has all required fields.

### Products not appearing
1. Check Firestore console to verify import
2. Ensure `status: "ACTIVE"` and `flags.isPublic: true`
3. Clear Next.js cache: `rm -rf .next`
