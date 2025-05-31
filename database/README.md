# Database Setup for Overlap Prevention

This guide explains how to set up database constraints to prevent overlapping events in your Supabase database.

## Setup Instructions

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor (or Database > SQL Editor)

2. **Run the Constraint Setup**
   - Copy the contents of `database/setup-overlap-constraint.sql`
   - Paste and run the SQL commands in the Supabase SQL Editor

3. **What the Constraint Does**
   - Prevents users from creating overlapping events
   - Uses PostgreSQL's exclusion constraint with `btree_gist` extension
   - Checks that no two events for the same user have overlapping time ranges
   - Also ensures that end_time is always after start_time

## How It Works

### The Exclusion Constraint
```sql
ALTER TABLE events 
ADD CONSTRAINT no_overlapping_events 
EXCLUDE USING gist (
  user_id WITH =,
  tsrange(start_time, end_time, '[)') WITH &&
);
```

This constraint works by:
- `user_id WITH =`: Ensures we're only comparing events from the same user
- `tsrange(start_time, end_time, '[)')`: Creates a time range (half-open interval)
- `WITH &&`: Uses the overlap operator to detect conflicting time ranges

### Error Handling in the App

The EventForm component already handles database constraint violations:

```javascript
if (eventError.message && eventError.message.includes('overlap') || 
    eventError.code === '23P01' || // PostgreSQL exclusion constraint violation
    eventError.message.includes('conflicting') ||
    eventError.message.includes('time')) {
  setErrors({
    time: "This time slot conflicts with an existing event. Please choose a different time."
  })
}
```

## Benefits of Database-Level Constraints

1. **Race Condition Prevention**: Multiple users can't create overlapping events simultaneously
2. **Data Integrity**: Enforced at the database level, can't be bypassed
3. **Simpler Client Code**: No complex overlap detection logic needed in the frontend
4. **Performance**: Database-optimized constraint checking
5. **Reliability**: Works even if client-side validation is disabled or bypassed

## Testing the Constraint

After setting up the constraint, try creating overlapping events in your calendar app. You should see the user-friendly error message when attempting to create conflicting time slots.

## Troubleshooting

- **Extension Error**: If you get an error about `btree_gist`, make sure your Supabase project has the extension enabled
- **Permission Error**: Ensure you're running the SQL as a database owner or with sufficient privileges
- **Existing Overlapping Data**: If you have existing overlapping events, you'll need to clean them up before adding the constraint
