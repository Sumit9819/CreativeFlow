import { User, UserRole, Project, AssetType, AssetStatus } from './types';

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Alex Design',
    role: UserRole.CREATOR,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=b6e3f4',
  },
  {
    id: 'u2',
    name: 'Sarah Boss',
    role: UserRole.APPROVER,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=ffdfbf',
  },
  {
    id: 'u3',
    name: 'Mike Client',
    role: UserRole.APPROVER,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike&backgroundColor=c0aede',
  },
  {
    id: 'u4',
    name: 'Jen Stakeholder',
    role: UserRole.OBSERVER,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jen&backgroundColor=ffdfbf',
  },
  {
    id: 'u5',
    name: 'Dave Admin',
    role: UserRole.SUPER_ADMIN,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dave&backgroundColor=d1d4f9',
  }
];

export const MOCK_NOTIFICATIONS = [
    { id: 1, text: "Mike Client approved 'Hero Banner Main'", time: "2m ago", read: false, type: 'success' },
    { id: 2, text: "New comment on 'Social Story Teaser'", time: "15m ago", read: false, type: 'info' },
    { id: 3, text: "Sarah Boss requested changes on 'Q3 Deck'", time: "1h ago", read: true, type: 'alert' },
    { id: 4, text: "Upload complete: 'Winter Campaign Assets'", time: "3h ago", read: true, type: 'info' },
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Summer Campaign 2024',
    clientName: 'Oceanic Beverages',
    assets: [
      {
        id: 'a1',
        title: 'Hero Banner Main',
        type: AssetType.IMAGE,
        status: AssetStatus.CHANGES_REQUESTED,
        thumbnail: 'https://picsum.photos/id/28/400/300',
        versions: [
          {
            id: 'v2',
            versionNumber: 2,
            url: 'https://picsum.photos/id/28/1200/800',
            createdAt: Date.now(),
            comments: [
              {
                id: 'c1',
                userId: 'u2',
                text: 'The contrast is a bit low here. Can we pop the colors?',
                timestamp: Date.now() - 100000,
                resolved: false,
                x: 45,
                y: 30,
                drawing: {
                    type: 'box',
                    rect: { x: 40, y: 25, w: 10, h: 10 },
                    color: '#ef4444'
                },
                replies: [
                    {
                        id: 'c1_r1',
                        userId: 'u1',
                        text: 'Sure, I will bump the saturation by 20%.',
                        timestamp: Date.now() - 50000,
                        resolved: false
                    }
                ]
              }
            ]
          },
          {
            id: 'v1',
            versionNumber: 1,
            url: 'https://picsum.photos/id/28/1200/800?grayscale',
            createdAt: Date.now() - 86400000,
            comments: []
          }
        ]
      },
      {
        id: 'a2',
        title: 'Social Story Teaser',
        type: AssetType.VIDEO,
        status: AssetStatus.PENDING,
        thumbnail: 'https://picsum.photos/id/96/400/300',
        versions: [
            {
                id: 'v1_video',
                versionNumber: 1,
                // Using a reliable sample video
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
                createdAt: Date.now(),
                comments: []
            }
        ]
      }
    ]
  },
  {
      id: 'p2',
      name: 'Q3 Financial Report',
      clientName: 'Apex Corp',
      assets: [
          {
              id: 'a3',
              title: 'Q3 Deck Draft',
              type: AssetType.DOCUMENT,
              status: AssetStatus.APPROVED,
              thumbnail: 'https://picsum.photos/id/1/400/300',
              versions: [
                  {
                      id: 'v1_doc',
                      versionNumber: 1,
                      url: 'https://picsum.photos/id/1/800/1000', // Mocking doc as image for demo
                      createdAt: Date.now(),
                      comments: []
                  }
              ]
          }
      ]
  }
];