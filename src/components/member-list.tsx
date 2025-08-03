'use client'

import { api } from '@/lib/api'
import { useState } from 'react'

export function MemberList() {
  const { data: members, isLoading, error } = api.member.getAll.useQuery()
  const [showUnclaimed, setShowUnclaimed] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 bg-red-50 rounded-lg">
        Error loading members: {error.message}
      </div>
    )
  }

  const filteredMembers = showUnclaimed 
    ? members?.filter(member => !member.user)
    : members

  if (!filteredMembers || filteredMembers.length === 0) {
    return (
      <div className="text-gray-500 text-center p-8 bg-gray-50 rounded-lg">
        {showUnclaimed ? 'No unclaimed members found.' : 'No members found. Add one to get started!'}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Family Members</h2>
        <button
          onClick={() => setShowUnclaimed(!showUnclaimed)}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
        >
          {showUnclaimed ? 'Show All' : 'Show Unclaimed'}
        </button>
      </div>

      {filteredMembers.map((member) => (
        <div key={member.id} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{member.name}</h3>
              {member.email && (
                <p className="text-gray-600">{member.email}</p>
              )}
              {member.bio && (
                <p className="text-sm text-gray-500 mt-1">{member.bio}</p>
              )}
            </div>
            <div className="text-right">
              {member.user ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Has Account
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Unclaimed
                </span>
              )}
            </div>
          </div>
          
          <div className="mt-3 flex justify-between items-center text-sm text-gray-400">
            <span>Added {new Date(member.createdAt).toLocaleDateString()}</span>
            {member.taggedIn && member.taggedIn.length > 0 && (
              <span>Tagged in {member.taggedIn.length} posts</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
