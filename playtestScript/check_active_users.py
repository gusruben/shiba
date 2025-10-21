import os
from dotenv import load_dotenv
import requests
import time
from datetime import datetime, timedelta
from collections import defaultdict

# Load environment variables from .env file
load_dotenv()

# Environment Variables
AIRTABLE_API_KEY = os.getenv("AIRTABLE_API_KEY")
AIRTABLE_BASE_ID = os.getenv("AIRTABLE_BASE_ID")

# Airtable configuration
AIRTABLE_API_BASE = 'https://api.airtable.com/v0'
USERS_TABLE = 'Users'
POSTS_TABLE = 'Posts'
GAMES_TABLE = 'Games'

def airtable_request(path, options=None):
    """Make a request to the Airtable API"""
    if options is None:
        options = {}
    
    url = f"{AIRTABLE_API_BASE}/{AIRTABLE_BASE_ID}/{path}"
    
    headers = {
        'Authorization': f'Bearer {AIRTABLE_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    # Add any additional headers from options
    if 'headers' in options:
        headers.update(options['headers'])
    
    response = requests.request(
        method=options.get('method', 'GET'),
        url=url,
        headers=headers,
        json=options.get('json'),
        params=options.get('params')
    )
    
    if not response.ok:
        raise Exception(f"Airtable error {response.status_code}: {response.text}")
    
    return response.json()

def fetch_all_posts(start_date_str):
    """
    Fetch all posts since a given date
    
    Args:
        start_date_str: Start date in YYYY-MM-DD format
    
    Returns:
        list: All post records
    """
    print(f"🔍 Fetching all posts since {start_date_str}...")
    print("=" * 60)
    
    all_posts = []
    offset = None
    batch_count = 0
    
    # Convert start date to ISO format for Airtable filter
    start_datetime = datetime.strptime(start_date_str, '%Y-%m-%d')
    start_iso = start_datetime.isoformat()
    
    # Build filter formula to get posts after start date
    filter_formula = f"IS_AFTER({{Created At}}, '{start_iso}')"
    
    while True:
        batch_count += 1
        params = {
            'pageSize': 100,
            'filterByFormula': filter_formula
        }
        if offset:
            params['offset'] = offset
        
        try:
            print(f"📦 Fetching batch {batch_count}...")
            page = airtable_request(f"{POSTS_TABLE}?{requests.compat.urlencode(params)}", {
                'method': 'GET'
            })
            
            page_records = page.get('records', [])
            all_posts.extend(page_records)
            offset = page.get('offset')
            
            print(f"   ✅ Fetched {len(page_records)} posts")
            
            if not offset:
                break
                
            # Small delay to avoid rate limiting
            time.sleep(0.1)
                
        except Exception as e:
            print(f"❌ Error fetching batch {batch_count}: {e}")
            break
    
    print(f"\n📊 Total posts fetched: {len(all_posts)}")
    return all_posts

def fetch_game_by_id(game_id):
    """
    Fetch a game record by its ID
    
    Args:
        game_id: Airtable record ID of the game
    
    Returns:
        dict: Game record, or None if not found
    """
    try:
        game_record = airtable_request(f"{GAMES_TABLE}/{requests.utils.quote(game_id)}", {
            'method': 'GET'
        })
        return game_record
    except Exception:
        return None

def fetch_user_by_id(user_id):
    """
    Fetch a user record by its ID
    
    Args:
        user_id: Airtable record ID of the user
    
    Returns:
        dict: User record, or None if not found
    """
    try:
        user_record = airtable_request(f"{USERS_TABLE}/{requests.utils.quote(user_id)}", {
            'method': 'GET'
        })
        return user_record
    except Exception:
        return None

def check_users_with_20plus_hours(days=14, hours_threshold=20):
    """
    Check how many users have logged 20+ hours in the past N days
    based on their Posts (HoursSpent + TimeSpentOnAsset)
    
    Args:
        days: Number of days to look back (default 14)
        hours_threshold: Minimum hours required (default 20)
    
    Returns:
        dict: Results with user counts and details
    """
    print(f"\n🎯 Checking users with {hours_threshold}+ hours in past {days} days")
    print("=" * 60)
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    start_date_str = start_date.strftime('%Y-%m-%d')
    end_date_str = end_date.strftime('%Y-%m-%d')
    
    print(f"📅 Date range: {start_date_str} to {end_date_str}")
    
    # Fetch all posts in the date range
    all_posts = fetch_all_posts(start_date_str)
    
    if not all_posts:
        print("❌ No posts found in this date range")
        return None
    
    # Cache for games and users to avoid repeated API calls
    game_cache = {}
    user_cache = {}
    
    # Dictionary to accumulate hours per user
    # Key: user_id, Value: {hours, email, first_name, last_name, slack_id, post_count}
    user_hours = defaultdict(lambda: {
        'hours': 0,
        'email': '',
        'first_name': '',
        'last_name': '',
        'slack_id': '',
        'record_id': '',
        'post_count': 0
    })
    
    print(f"\n⏳ Processing {len(all_posts)} posts...")
    print("-" * 60)
    
    for i, post in enumerate(all_posts, 1):
        fields = post.get('fields', {})
        
        # Get the linked game ID(s)
        game_ids = fields.get('Game', [])
        if not game_ids:
            continue
        
        # Take the first game ID
        game_id = game_ids[0] if isinstance(game_ids, list) else game_ids
        
        # Fetch game from cache or API
        if game_id not in game_cache:
            game_record = fetch_game_by_id(game_id)
            game_cache[game_id] = game_record
            time.sleep(0.05)  # Small delay to avoid rate limiting
        else:
            game_record = game_cache[game_id]
        
        if not game_record:
            continue
        
        # Get the owner email directly from the game record
        game_fields = game_record.get('fields', {})
        owner_email_raw = game_fields.get('ownerEmail', '')
        
        # Handle if ownerEmail is a list (extract first element) or string
        if isinstance(owner_email_raw, list):
            owner_email = owner_email_raw[0] if owner_email_raw else ''
        else:
            owner_email = owner_email_raw
        
        # Ensure owner_email is a string and not empty
        if not owner_email or not isinstance(owner_email, str):
            continue
        
        owner_email = owner_email.strip()  # Clean up any whitespace
        if not owner_email:
            continue
        
        # Use email as the key instead of user_id
        # Get user info (only once per user)
        if not user_hours[owner_email]['record_id']:
            # Get owner info from game record
            owner_ids = game_fields.get('Owner', [])
            user_id = owner_ids[0] if isinstance(owner_ids, list) and owner_ids else 'unknown'
            
            # Get owner name from game record if available
            owner_name_raw = game_fields.get('ownerName', '')
            owner_name = owner_name_raw[0] if isinstance(owner_name_raw, list) and owner_name_raw else owner_name_raw
            
            # Try to parse first/last name from ownerName
            first_name = ''
            last_name = ''
            if owner_name:
                name_parts = owner_name.split(' ', 1)
                first_name = name_parts[0] if len(name_parts) > 0 else ''
                last_name = name_parts[1] if len(name_parts) > 1 else ''
            
            # Get slack id
            slack_id_raw = game_fields.get('slack id', '')
            slack_id = slack_id_raw[0] if isinstance(slack_id_raw, list) and slack_id_raw else slack_id_raw
            
            user_hours[owner_email]['record_id'] = user_id
            user_hours[owner_email]['email'] = owner_email
            user_hours[owner_email]['first_name'] = first_name
            user_hours[owner_email]['last_name'] = last_name
            user_hours[owner_email]['slack_id'] = slack_id
        
        # Calculate hours from this post
        # HoursSpent is already in hours
        hours_spent = fields.get('HoursSpent', 0) or 0
        
        # TimeSpentOnAsset is in minutes (based on the field name patterns in the code)
        time_spent_on_asset = fields.get('TimeSpentOnAsset', 0) or 0
        time_spent_hours = time_spent_on_asset / 60  # Convert minutes to hours
        
        total_post_hours = hours_spent + time_spent_hours
        
        # Add to user's total (keyed by email)
        user_hours[owner_email]['hours'] += total_post_hours
        user_hours[owner_email]['post_count'] += 1
        
        # Show progress every 100 posts
        if i % 100 == 0:
            print(f"   Progress: {i}/{len(all_posts)} posts processed...")
    
    print(f"\n✅ Processed all posts")
    print(f"   Found {len(user_hours)} unique users with posts")
    
    # Convert to list format
    users_with_hours = []
    for email, data in user_hours.items():
        users_with_hours.append({
            'record_id': data['record_id'],
            'email': email,
            'first_name': data['first_name'],
            'last_name': data['last_name'],
            'slack_id': data['slack_id'],
            'hours': data['hours'],
            'post_count': data['post_count']
        })
    
    # Calculate minimum posts required (one post every 48 hours with 3-day grace period)
    # Formula: (days - 3) / 2
    # Example: 14 days = (14-3)/2 = 5.5 posts minimum
    grace_days = 3
    min_posts_required = max(1, (days - grace_days) / 2)
    
    # Filter users with threshold+ hours AND minimum posts requirement
    active_users = [
        u for u in users_with_hours 
        if u['hours'] >= hours_threshold and u['post_count'] >= min_posts_required
    ]
    
    # Track users who met hours but not posts requirement
    hours_only_users = [
        u for u in users_with_hours 
        if u['hours'] >= hours_threshold and u['post_count'] < min_posts_required
    ]
    
    # Sort by hours (descending)
    active_users.sort(key=lambda x: x['hours'], reverse=True)
    hours_only_users.sort(key=lambda x: x['hours'], reverse=True)
    users_with_hours.sort(key=lambda x: x['hours'], reverse=True)
    
    # Print active users
    print(f"\n🌟 Users meeting all requirements:")
    print(f"   ({hours_threshold}+ hours AND {min_posts_required:.1f}+ posts - posting every 48h with 3-day grace)")
    print("-" * 60)
    for user in active_users:
        name = f"{user['first_name']} {user['last_name']}".strip() or user['email']
        print(f"✅ {name[:30]:<30} - {user['hours']:6.1f}h ({user['post_count']} posts)")
    
    # Print users who had hours but not enough posts
    if hours_only_users:
        print(f"\n⚠️  Users with {hours_threshold}+ hours but fewer than {min_posts_required:.1f} posts:")
        print("-" * 60)
        for user in hours_only_users:
            name = f"{user['first_name']} {user['last_name']}".strip() or user['email']
            print(f"❌ {name[:30]:<30} - {user['hours']:6.1f}h ({user['post_count']} posts) - Not enough posts")
    
    # Print simple email list
    if active_users:
        print(f"\n📧 Email list (line-separated) - Users meeting ALL requirements:")
        print("-" * 60)
        for user in active_users:
            print(user['email'])
    
    return {
        'total_posts': len(all_posts),
        'total_users': len(user_hours),
        'users_with_data': len(users_with_hours),
        'active_users': active_users,
        'hours_only_users': hours_only_users,
        'all_users_with_hours': users_with_hours,
        'hours_threshold': hours_threshold,
        'min_posts_required': min_posts_required,
        'days': days,
        'start_date': start_date_str,
        'end_date': end_date_str
    }

def display_results(results):
    """Display the results in a nice format"""
    if not results:
        return
    
    print(f"\n")
    print("=" * 60)
    print(f"📊 RESULTS SUMMARY")
    print("=" * 60)
    
    print(f"\n📈 Statistics:")
    print(f"   Date range: {results['start_date']} to {results['end_date']}")
    print(f"   Days analyzed: {results['days']}")
    print(f"   Hours threshold: {results['hours_threshold']}+")
    print(f"   Minimum posts required: {results['min_posts_required']:.1f} (posting every 48h with 3-day grace)")
    print(f"   Total posts analyzed: {results['total_posts']}")
    print(f"   Total users found: {results['total_users']}")
    print(f"   Users with time data: {results['users_with_data']}")
    print(f"   Users meeting ALL requirements: {len(results['active_users'])}")
    if results.get('hours_only_users'):
        print(f"   Users with hours but not enough posts: {len(results['hours_only_users'])}")
    
    active_users = results['active_users']
    hours_only_users = results.get('hours_only_users', [])
    
    if active_users:
        print(f"\n🎯 Users meeting ALL requirements ({len(active_users)} users):")
        print(f"   ({results['hours_threshold']}+ hours AND {results['min_posts_required']:.1f}+ posts)")
        print("-" * 80)
        for i, user in enumerate(active_users, 1):
            name = f"{user['first_name']} {user['last_name']}".strip() or "No name"
            email_part = user['email'][:25] if user['email'] else "No email"
            print(f"{i:3d}. {name[:25]:<25} - {user['hours']:6.1f}h - {user['post_count']:3d} posts - {email_part}")
        
        # Show statistics
        total_hours = sum(u['hours'] for u in active_users)
        total_posts = sum(u['post_count'] for u in active_users)
        avg_hours = total_hours / len(active_users)
        avg_posts = total_posts / len(active_users)
        print(f"\n   Total hours (active users): {total_hours:.1f}h")
        print(f"   Total posts (active users): {total_posts}")
        print(f"   Average hours per user: {avg_hours:.1f}h")
        print(f"   Average posts per user: {avg_posts:.1f}")
        print(f"   Highest: {active_users[0]['hours']:.1f}h ({active_users[0]['post_count']} posts)")
        print(f"   Lowest (≥{results['hours_threshold']}h): {active_users[-1]['hours']:.1f}h ({active_users[-1]['post_count']} posts)")
        
        # Print simple email list
        print(f"\n📧 Email list (line-separated) - Users meeting ALL requirements:")
        print("-" * 60)
        for user in active_users:
            print(user['email'])
    else:
        print(f"\n❌ No users found meeting all requirements")
    
    # Show users who had hours but not enough posts
    if hours_only_users:
        print(f"\n⚠️  Users with {results['hours_threshold']}+ hours but fewer than {results['min_posts_required']:.1f} posts:")
        print("-" * 80)
        for i, user in enumerate(hours_only_users, 1):
            name = f"{user['first_name']} {user['last_name']}".strip() or "No name"
            email_part = user['email'][:25] if user['email'] else "No email"
            print(f"{i:3d}. {name[:25]:<25} - {user['hours']:6.1f}h - {user['post_count']:3d} posts - {email_part} ❌")
    
    # Show distribution
    all_users = results['all_users_with_hours']
    if all_users:
        print(f"\n📊 Hours Distribution (all users with data):")
        print("-" * 60)
        
        # Create buckets
        buckets = {
            '0-5h': 0,
            '5-10h': 0,
            '10-15h': 0,
            '15-20h': 0,
            '20-30h': 0,
            '30-40h': 0,
            '40-50h': 0,
            '50+h': 0
        }
        
        for user in all_users:
            h = user['hours']
            if h < 5:
                buckets['0-5h'] += 1
            elif h < 10:
                buckets['5-10h'] += 1
            elif h < 15:
                buckets['10-15h'] += 1
            elif h < 20:
                buckets['15-20h'] += 1
            elif h < 30:
                buckets['20-30h'] += 1
            elif h < 40:
                buckets['30-40h'] += 1
            elif h < 50:
                buckets['40-50h'] += 1
            else:
                buckets['50+h'] += 1
        
        for bucket, count in buckets.items():
            if count > 0:
                bar = '█' * min(count, 50)  # Limit bar length
                print(f"   {bucket:>10}: {count:3d} users {bar}")

def save_results(results):
    """Save results to a file"""
    if not results:
        return
    
    import json
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"active_users_{results['days']}days_{results['hours_threshold']}h_{timestamp}.json"
    
    # Convert to serializable format
    output = {
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'start_date': results['start_date'],
            'end_date': results['end_date'],
            'days_analyzed': results['days'],
            'hours_threshold': results['hours_threshold'],
            'min_posts_required': results['min_posts_required'],
            'posting_requirement': 'One post every 48 hours with 3-day grace period',
            'total_posts': results['total_posts'],
            'total_users': results['total_users'],
            'users_with_data': results['users_with_data'],
            'active_users_count': len(results['active_users']),
            'hours_only_users_count': len(results.get('hours_only_users', [])),
            'data_source': 'Posts table (HoursSpent + TimeSpentOnAsset)'
        },
        'active_users': results['active_users'],
        'hours_only_users': results.get('hours_only_users', []),
        'all_users': results['all_users_with_hours']
    }
    
    with open(filename, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"\n💾 Results saved to: {filename}")

def main():
    """Main function"""
    print("🚀 Shiba Active Users Checker")
    print("=" * 60)
    print("This script checks how many users have logged hours via Posts")
    print("(Sums HoursSpent + TimeSpentOnAsset from all posts)")
    print()
    
    try:
        # Get parameters from user
        try:
            days_input = input("📅 How many days to look back? (default: 14): ").strip()
            days = int(days_input) if days_input else 14
        except ValueError:
            days = 14
            print(f"   Using default: {days} days")
        
        try:
            hours_input = input("⏰ Minimum hours threshold? (default: 20): ").strip()
            hours_threshold = int(hours_input) if hours_input else 20
        except ValueError:
            hours_threshold = 20
            print(f"   Using default: {hours_threshold} hours")
        
        # Run the check
        results = check_users_with_20plus_hours(days=days, hours_threshold=hours_threshold)
        
        # Display results
        display_results(results)
        
        # Ask if user wants to save
        save_choice = input("\n💾 Save results to file? (y/n): ").strip().lower()
        if save_choice == 'y':
            save_results(results)
        
        print(f"\n✅ Done!")
        
    except KeyboardInterrupt:
        print("\n\n❌ Operation cancelled by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

