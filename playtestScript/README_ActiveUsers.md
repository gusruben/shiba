# Active Users Checker

This script determines how many users have logged a specified number of hours on their Shiba projects in a given time period, based on their Posts in Airtable.

## Purpose

Quickly identify active users in your community by analyzing their development posts. The script sums up `HoursSpent` and `TimeSpentOnAsset` from all posts in a given date range.

**Requirements to be considered "active":**
- Logged 20+ hours (default, configurable)
- Posted at least once every 48 hours (with a 3-day grace period)
  - For 14 days: minimum 5.5 posts
  - For 7 days: minimum 2 posts
  - Formula: `(days - 3) / 2`

## Usage

```bash
python check_active_users.py
```

The script will prompt you for:
1. **Days to look back** (default: 14) - How many days of history to check
2. **Minimum hours threshold** (default: 20) - Minimum hours to be considered "active"

## Features

- ✅ Fetches all posts from Airtable in the specified date range
- ✅ Groups posts by game owner (via `ownerEmail` field)
- ✅ Calculates total hours from `HoursSpent` + `TimeSpentOnAsset` fields
- ✅ **Enforces posting frequency requirement** (one post every 48h with 3-day grace)
- ✅ Shows users who met hours but not posting frequency
- ✅ Shows detailed statistics including post counts per user
- ✅ **Outputs a simple line-separated email list for easy copying**
- ✅ Shows hours distribution across all users
- ✅ Option to save results to JSON file
- ✅ Progress updates during processing
- ✅ Caching to minimize API calls

## Output

The script provides:

1. **Summary Statistics**
   - Total posts analyzed
   - Total users found (with posts in the date range)
   - Number of users meeting ALL requirements (hours + posting frequency)
   - Number of users with enough hours but not enough posts
   - Breakdown of hours and posts

2. **Active Users List** (meeting ALL requirements)
   - Name, email, hours, and post count for each active user
   - Sorted by hours (highest first)
   - Shows average hours and posts per user
   - Includes a simple line-separated email list at the end

3. **Users with Hours But Not Enough Posts**
   - Shows users who logged enough hours but didn't post frequently enough
   - Helps identify users who might be logging time in bulk rather than consistently

4. **Hours Distribution**
   - Visual histogram showing how many users fall into each hour bucket
   - Buckets: 0-5h, 5-10h, 10-15h, 15-20h, 20-30h, 30-40h, 40-50h, 50+h

5. **Optional JSON Export**
   - Complete data for further analysis
   - Includes metadata, post counts, and all user details
   - Clearly marked data source (Posts table)

## Requirements

Make sure you have the required environment variables set in your `.env` file:

```
AIRTABLE_API_KEY=your_key_here
AIRTABLE_BASE_ID=your_base_id_here
```

The script accesses the following Airtable tables:
- `Posts` - To get time data (HoursSpent, TimeSpentOnAsset)
- `Games` - To get owner information (ownerEmail, ownerName, slack id)

## Example Output

```
🎯 Checking users with 20+ hours in past 14 days
============================================================
📅 Date range: 2025-10-02 to 2025-10-16

🔍 Fetching all posts since 2025-10-02...
============================================================
📦 Fetching batch 1...
   ✅ Fetched 100 posts

📊 Total posts fetched: 342

⏳ Processing 342 posts...
------------------------------------------------------------
   Progress: 100/342 posts processed...
   Progress: 200/342 posts processed...
   Progress: 300/342 posts processed...

✅ Processed all posts
   Found 48 unique users with posts

🌟 Users meeting all requirements:
   (20+ hours AND 5.5+ posts - posting every 48h with 3-day grace)
------------------------------------------------------------
✅ Alice Johnson               -   45.3h (12 posts)
✅ Bob Smith                  -   32.1h (8 posts)
✅ Charlie Brown              -   28.7h (15 posts)

⚠️  Users with 20+ hours but fewer than 5.5 posts:
------------------------------------------------------------
❌ David Wilson               -   24.5h (3 posts) - Not enough posts

============================================================
📊 RESULTS SUMMARY
============================================================

📈 Statistics:
   Date range: 2025-10-02 to 2025-10-16
   Days analyzed: 14
   Hours threshold: 20+
   Minimum posts required: 5.5 (posting every 48h with 3-day grace)
   Total posts analyzed: 342
   Total users found: 48
   Users with time data: 48
   Users meeting ALL requirements: 15
   Users with hours but not enough posts: 3

🎯 Users meeting ALL requirements (15 users):
   (20+ hours AND 5.5+ posts)
--------------------------------------------------------------------------------
  1. Alice Johnson         -   45.3h -  12 posts - alice@example.com
  2. Bob Smith            -   32.1h -   8 posts - bob@example.com
  3. Charlie Brown        -   28.7h -  15 posts - charlie@example.com
  ...

   Total hours (active users): 412.5h
   Total posts (active users): 156
   Average hours per user: 27.5h
   Average posts per user: 10.4
   Highest: 45.3h (12 posts)
   Lowest (≥20h): 20.1h (6 posts)

📧 Email list (line-separated) - Users meeting ALL requirements:
------------------------------------------------------------
alice@example.com
bob@example.com
charlie@example.com
...

⚠️  Users with 20+ hours but fewer than 5.5 posts:
--------------------------------------------------------------------------------
  1. David Wilson         -   24.5h -   3 posts - david@example.com ❌
  2. Emily Davis          -   22.1h -   4 posts - emily@example.com ❌
...
```

## Notes

- The script has built-in rate limiting delays to avoid hitting API limits
- Posts without a linked game will be skipped
- Games without an `ownerEmail` field will be skipped
- `HoursSpent` is counted as-is (in hours)
- `TimeSpentOnAsset` is converted from minutes to hours
- Processing time depends on the number of posts and unique games
- Uses caching to minimize redundant API calls for games
- Only counts posts created after the start date (uses Airtable's `Created At` field)
- Email addresses are pulled from the `ownerEmail` field on the Games table (handles both string and list format)
- User names are parsed from the `ownerName` field on the Games table
- The output includes a simple line-separated email list for easy copying
- Minimum posts required calculation: `(days - 3) / 2` (48-hour posting frequency with 3-day grace)

