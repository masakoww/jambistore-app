import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebaseAdmin'

export const dynamic = 'force-dynamic'

// GET all categories
export async function GET() {
  try {
    // Fetch from 'categories' collection - same path used by admin and public pages
    const categoriesSnapshot = await adminDb
      .collection('categories')
      .get()

    // Map and normalize category data, sort by order field (with fallback)
    const categories = categoriesSnapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name || data.title || '', // Support both 'name' and 'title' fields
          slug: data.slug || '',
          description: data.description || '',
          icon: data.icon || '',
          order: typeof data.order === 'number' ? data.order : 999,
          createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || null,
        }
      })
      .sort((a, b) => a.order - b.order)

    console.log(`📁 [Categories] Fetched ${categories.length} categories`)

    return NextResponse.json({ success: true, categories })
  } catch (error) {
    console.error('❌ [Categories] Error fetching categories:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch categories', error: String(error) },
      { status: 500 }
    )
  }
}

// POST create new category
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, slug, description, icon } = body

    if (!name || !slug) {
      return NextResponse.json(
        { success: false, message: 'Name and slug are required' },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const existingCategory = await adminDb
      .collection('categories')
      .where('slug', '==', slug)
      .limit(1)
      .get()

    if (!existingCategory.empty) {
      return NextResponse.json(
        { success: false, message: 'Category with this slug already exists' },
        { status: 400 }
      )
    }

    // Get total categories for order
    const categoriesSnapshot = await adminDb.collection('categories').get()
    const order = categoriesSnapshot.size

    const categoryData = {
      name,
      slug: slug.toLowerCase().replace(/\s+/g, '-'),
      description: description || '',
      ...(icon ? { icon } : {}),
      order,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const docRef = await adminDb.collection('categories').add(categoryData)

    return NextResponse.json({
      success: true,
      message: 'Category created successfully',
      category: { id: docRef.id, ...categoryData },
    })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create category' },
      { status: 500 }
    )
  }
}
