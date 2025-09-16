import React from 'react'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'
import { AddMemberDialog } from './AddMemberSheet'

interface QuickAddMemberProps {
  onMemberAdded?: () => void
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

export const QuickAddMember: React.FC<QuickAddMemberProps> = ({ 
  onMemberAdded,
  variant = 'default',
  size = 'default',
  className = ''
}) => {
  return (
    <AddMemberDialog onMemberAdded={onMemberAdded} />
  )
}
