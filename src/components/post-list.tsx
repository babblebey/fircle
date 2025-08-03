'use client'

import { api } from '@/lib/api'

export function PostList() {
  const { data: posts, isLoading, error } = api.post.getAll.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 bg-red-50 rounded-lg">
        Error loading posts: {error.message}
      </div>
    )
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="text-gray-500 text-center p-8 bg-gray-50 rounded-lg">
        No posts found. Create the first post to get started!
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Family Posts</h2>
      
      {posts.map((post) => (
        <div key={post.id} className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                {post.author.member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold">{post.author.member.name}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
            {!post.isPublic && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Private
              </span>
            )}
          </div>

          {post.title && (
            <h4 className="text-lg font-medium mb-2">{post.title}</h4>
          )}

          <div className="mb-4">
            <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
          </div>

          {post.imageUrls && post.imageUrls.length > 0 && (
            <div className="mb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {post.imageUrls.map((url, index) => (
                  <img 
                    key={index}
                    src={url} 
                    alt={`Post image ${index + 1}`}
                    className="w-full h-32 object-cover rounded-md"
                  />
                ))}
              </div>
            </div>
          )}

          {post.taggedMembers && post.taggedMembers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-600">Tagged:</span>
              {post.taggedMembers.map((taggedMember) => (
                <span 
                  key={taggedMember.id}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {taggedMember.member.name}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
