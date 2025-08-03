import { MemberList } from '@/components/member-list'
import { AddMemberForm } from '@/components/add-member-form'
import { PostList } from '@/components/post-list'

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          Welcome to Fircle
        </h1>
        <p className="text-lg text-gray-600 text-center mb-12">
          Your family circle management app with enhanced member and post management
        </p>
        
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Add Member Form */}
          <div className="lg:col-span-1">
            <h2 className="text-2xl font-semibold mb-4">Add Family Member</h2>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <AddMemberForm />
            </div>
          </div>
          
          {/* Members List */}
          <div className="lg:col-span-2">
            <MemberList />
          </div>
        </div>

        {/* Posts Section */}
        <div className="mt-12">
          <PostList />
        </div>

        {/* Legacy Family Member Form - Keep for backward compatibility */}
        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium mb-4 text-gray-600">
            Legacy Family Member Management
          </h3>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h4 className="text-xl font-semibold mb-4">Add Family Member (Legacy)</h4>
              {/* This will still work with the old familyMember router */}
              <div className="text-sm text-gray-500">
                The original family member form is still available for backward compatibility.
                We recommend using the new member management system above.
              </div>
            </div>
            
            <div>
              <h4 className="text-xl font-semibold mb-4">Family Members (Legacy)</h4>
              <div className="text-sm text-gray-500">
                Legacy family member list functionality is still available.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
