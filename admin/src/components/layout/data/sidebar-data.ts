import { FileText } from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'GoPress',
    email: 'admin@gopress.local',
    avatar: '/favicon.svg',
  },
  teams: [],
  navGroups: [
    {
      title: '内容管理',
      items: [
        {
          title: '文章',
          url: '/posts',
          icon: FileText,
        },
      ],
    },
  ],
}
