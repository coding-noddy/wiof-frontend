# WIOF Product Master Plan

## Page 1

WIOF Product Master Plan
From a Content Website to a Global Sustainability Movement
Prepared for: WIOF Core Team
Planning Horizon: 24 Months
Current Stack: Angular + Firebase + Firestore + Firebase Storage + Firebase Hosting + Admin CMS
Executive Summary
After reviewing the existing WIOF platform, admin dashboard, feature set, and frontend structure, I believe 
the technical foundation is already strong.
This roadmap deliberately does not replace what exists.
Instead, every phase extends your current application.
The goal is:
Build a platform that encourages millions of people to perform small positive actions every
day and records the collective impact.
Everything below is designed around that vision.
Current Architecture
Current modules
Homepage
Blogs
Coffee Conversations
Courses
Breaking News
Calendar
1


## Page 2

Polls
Firm In Focus
Team Profiles
Newsletter
EQ Assessment
Admin Dashboard
These are all valuable.
The issue is they are isolated.
Our job is to connect them.
Future Architecture
                    WIOF
          Daily Life Companion
                 │
      ┌──────────┼──────────┐
Learning      Action      Community
      └──────────┼──────────┘
          Personal Growth
                 │
          Measurable Impact
2


## Page 3

PHASE 1
Foundation for User Accounts
Duration
3-4 Weeks
Priority
★★★★★
Goal
Allow visitors to become members.
Currently
Admin Login only.
Future
Admin Login
↓
Username + Password
Users
Continue with Google
No password management.
Firebase Authentication already supports this.
UI Changes
Header
Current
3


## Page 4

Home
Blogs
About
Our Team
Future
Home
Elements
Learn
Community
My Journey
Login
New User Menu
After login
Profile
Saved Articles
My Courses
My Actions
My Progress
Achievements
Settings
4


## Page 5

Firestore Collections
users
user_profiles
saved_articles
saved_courses
notifications
activity_logs
User Profile Schema
User
uid
name
email
photoURL
joinedDate
preferredElements
country
city
language
lastLogin
5


## Page 6

Engagement Data
loginCount
lastVisit
daysVisited
currentStreak
completedActions
completedCourses
savedBlogs
PHASE 2
Transform Homepage
Duration
4 Weeks
Priority
★★★★★
Current Homepage
Hero
Coffee
News
Course
Calendar
6


## Page 7

Poll
Future Homepage
Hero
↓
Today's Focus
↓
Choose Your Element
↓
One Small Step
↓
Trending Story
↓
Coffee Conversation
↓
Upcoming Event
↓
Mission
↓
Community Impact
↓
Newsletter
7


## Page 8

Hero Section
Instead of
Welcome to WIOF
Use
One Small Step.
One Better World.
Start today's journey.
CTA
Take Today's Step
Explore Five Elements
Today's Focus Card
Automatically changes daily.
Example
Today's Element
Earth
One Blog
One Video
One Poll
One Challenge
No manual work.
Admin only chooses featured content.
8


## Page 9

PHASE 3
Five Elements Become Navigation
Duration
6 Weeks
Priority
★★★★★
Instead of
Blogs
Videos
Courses
Navigation becomes
Earth
Water
Air
Energy
Spirit
Each Element contains
Hero
Latest Articles
Featured Course
Videos
9


## Page 10

Polls
Events
NGO
Daily Challenge
Recommended Reading
Related Elements
Every content item receives
element
Earth
Water
Air
Energy
Spirit
Simply add a new Firestore field.
No restructuring required.
PHASE 4
One Small Step Engine
Duration
5 Weeks
Priority
★★★★★
10


## Page 11

This becomes WIOF's signature feature.
Admin Panel
New Module
Daily Actions
Admin creates
Title
Description
Element
Difficulty
Duration
Estimated Impact
Verification
Start Date
End Date
Examples
Carry reusable bottle
Walk 1 km
Meditate 5 minutes
Plant one sapling
Switch off unnecessary lights
11


## Page 12

User Experience
Today's Step
Read
↓
Complete
↓
Mark Complete
↓
Earn Badge
↓
See Global Impact
Firestore
daily_actions
user_action_completion
Completion
userId
actionId
completedAt
note
photo(optional)
12


## Page 13

PHASE 5
Personal Dashboard
Duration
4 Weeks
Priority
★★★★★
Every user gets
Welcome Back
Today's Mission
Current Streak
Saved Articles
Courses
Recent Activity
Impact
Badges
Impact Widget
Actions Completed
Water Saved
Trees Inspired
Plastic Avoided
Learning Hours
13


## Page 14

Meditation Minutes
Even if values are estimated.
PHASE 6
Monthly Missions
Duration
4 Weeks
Admin creates
Mission
Description
Goal
Duration
Banner
Rewards
Examples
Plastic Free August
River September
Mindful October
Users Join
↓
Track Progress
↓
14


## Page 15

Mission Ends
↓
Impact Published
PHASE 7
Environment Calendar 2.0
Current
Calendar shows events.
Future
Calendar becomes interactive.
Example
5 June
Environment Day
↓
Read
↓
Watch
↓
Complete Action
↓
Join Event
Everything linked.
15


## Page 16

PHASE 8
Community
Duration
8 Weeks
Communities
Schools
Companies
Cities
Families
Universities
Future
Pune Community
120 Members
542 Actions
200 Trees
4500 kg Carbon Saved
Users choose
Join Community
Firestore
communities
16


## Page 17

community_members
community_actions
PHASE 9
Impact Engine
Probably the most important backend feature.
Current
You store content.
Future
You store
Impact.
Every completed action generates
Impact Record
Example
Action
Walk Instead of Drive
Distance
2 km
Carbon Saved
350 grams
All values configurable.
17


## Page 18

Admin decides estimates.
Collections
impact_records
impact_summary
Global Dashboard
People
15,000
Actions
250,000
Water Saved
15M Litres
Carbon Saved
18 Tons
Trees
4,200
This becomes WIOF's identity.
PHASE 10
Content Recommendation
Every page
Instead of ending.
18


## Page 19

Shows
Continue Learning
↓
Related Blog
↓
Related Video
↓
Related Course
↓
Today's Action
Keeps users engaged.
PHASE 11
AI Assistant
Future
Ask WIOF
How do I save water?
Recommend course
Summarize article
Daily inspiration
Suggest today's action
Simple OpenAI integration.
19


## Page 20

PHASE 12
Mobile Experience
Instead of desktop adaptation.
Think
Daily Companion.
Bottom Navigation
Home
Elements
Action
Community
Profile
Much easier.
ADMIN DASHBOARD IMPROVEMENTS
Current dashboard is already good.
Just extend it.
New menu
Dashboard
Blogs
Polls
Breaking News
Calendar
20


## Page 21

Coffee
Courses
Team
Subscribers
──────────────
Daily Actions
Monthly Missions
Communities
Achievements
Badges
Notifications
Users
Reports
Analytics
Impact Dashboard
No redesign required.
ANALYTICS
Track
Daily Users
Weekly Users
Returning Users
Article Reads
21


## Page 22

Course Completion
Mission Completion
Daily Actions
Average Streak
Top Elements
Popular Blogs
Community Growth
Store
analytics_daily
analytics_monthly
DATABASE GROWTH PLAN
Current
blogs
polls
courses
calendar
Future
users
profiles
actions
22


## Page 23

missions
communities
achievements
notifications
impact
analytics
saved_content
comments (future)
reports (future)
WHAT NOT TO BUILD YET
Avoid
❌ Chat system
❌ Social media clone
❌ Video hosting
❌ Complex LMS
❌ Marketplace
❌ Excessive gamification
❌ Hundreds of badges
These add complexity without significantly increasing impact at your current stage.
23


## Page 24

DEVELOPMENT ROADMAP
Quarter 1
Google Sign-In
User Profiles
Personal Dashboard
Saved Articles
Five Element tagging
Homepage refresh
Quarter 2
One Small Step
Daily streaks
Monthly missions
Notifications
Related content engine
Quarter 3
Community support
Impact dashboard
Analytics
Volunteer registration
Leaderboards for communities (not individuals)
Quarter 4
AI assistant
Personalized recommendations
Advanced search
Multi-language support
Public API for partners
Estimated Effort (Single Developer + Part-Time
Designer)
Phase
Duration
User Accounts
3-4 weeks
Homepage & Elements
4-5 weeks
Daily Actions
5 weeks
• 
• 
• 
• 
• 
• 
• 
• 
• 
• 
• 
• 
• 
• 
• 
• 
• 
• 
• 
• 
• 
24


## Page 25

Phase
Duration
User Dashboard
4 weeks
Missions
4 weeks
Community
8 weeks
Impact Engine
5 weeks
AI Features
6 weeks
Polish & Optimization
Ongoing
Total: ~9–12 months for a polished V2 if developed steadily alongside content work.
Final Vision
Three years from now, success should not be measured by "How many visitors came to WIOF?"
Instead, the homepage should proudly display something like:
2.3 million people have taken 18.7 million positive actions through WIOF. Together they
have saved an estimated 320 million litres of water, reduced 5,400 tonnes of CO₂
emissions, planted or inspired 480,000 trees, and contributed over 1.2 million hours to
personal growth and community well-being.
That is when WIOF stops being a website and becomes a movement.
My Recommendation as Your Technical Architect
Given your current Angular + Firebase codebase, I would not rewrite anything.
I would evolve it incrementally:
Keep the existing admin dashboard.
Add capabilities instead of replacing modules.
Reuse existing content everywhere through element tagging.
Make "One Small Step" the heart of the platform.
Treat every new feature as something that either helps a person learn, helps them act, or helps
measure collective impact. If a feature doesn't serve one of those goals, it probably doesn't belong
in WIOF.
This approach minimizes cost, preserves your existing investment, and creates a platform that can grow
from hundreds to millions of users without losing its purpose.
1. 
2. 
3. 
4. 
5. 
25


