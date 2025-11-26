import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebaseAdmin'

export const dynamic = 'force-dynamic'

// PATCH update category
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = params.id
    const body = await request.json()
    const { name, slug, description, icon } = body

    if (!name || !slug) {
      return NextResponse.json(
        { ok: false, message: 'Name and slug are required' },
        { status: 400 }
      )
    }

    // Check if slug already exists (excluding current category)
    const existingCategory = await adminDb
      .collection('categories')
      .where('slug', '==', slug)
      .limit(2)
      .get()

    const otherCategory = existingCategory.docs.find((doc) => doc.id !== categoryId)
    if (otherCategory) {
      return NextResponse.json(
        { ok: false, message: 'Category with this slug already exists' },
        { status: 400 }
      )
    }

    const categoryData = {
      name,
      slug: slug.toLowerCase().replace(/\s+/g, '-'),
      description: description || '',
      ...(icon ? { icon } : { icon: '' }),
      updatedAt: new Date(),
    }

    await adminDb.collection('categories').doc(categoryId).update(categoryData)

    return NextResponse.json({
      ok: true,
      message: 'Category updated successfully',
      category: { id: categoryId, ...categoryData },
    })
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      { ok: false, message: 'Failed to update category' },
      { status: 500 }
    )
  }
}

// DELETE category
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = params.id

    // Check if category is being used by products
    const productsWithCategory = await adminDb
      .collection('products')
      .where('category', '==', categoryId)
      .limit(1)
      .get()

    if (!productsWithCategory.empty) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Cannot delete category that is being used by products',
        },
        { status: 400 }
      )
    }

    await adminDb.collection('categories').doc(categoryId).delete()

    return NextResponse.json({
      ok: true,
      message: 'Category deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { ok: false, message: 'Failed to delete category' },
      { status: 500 }
    )
  }
}
