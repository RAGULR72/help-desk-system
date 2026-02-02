# 🤖 Auto-Assignment System

## Overview
The Auto-Assignment System is an intelligent ticket routing feature that automatically assigns incoming help desk tickets to the most suitable technicians based on multiple factors including skills, workload, performance, and location.

## Features

### 🎯 Core Capabilities
- **Intelligent Routing**: Multiple assignment strategies (Balanced, Skill Match, Least Busy, Round Robin)
- **Skill-Based Matching**: Match tickets to technicians based on their expertise
- **Workload Balancing**: Prevent technician overload by distributing tickets evenly
- **Performance Tracking**: Consider historical performance and customer ratings
- **Location Awareness**: Factor in geographic proximity for on-site visits
- **Configurable Rules**: Create custom assignment rules based on ticket attributes
- **Real-time Availability**: Track technician working hours and status
- **Assignment History**: Complete audit trail of all assignments with scoring details
- **Analytics**: Track assignment effectiveness and technician performance

### 📊 Assignment Strategies

1. **Balanced** (Recommended)
   - Uses weighted scoring combining skill, workload, performance, and location
   - Default weights: Skill (40%), Workload (30%), Performance (20%), Location (10%)
   - Fully customizable weights

2. **Skill Match**
   - Prioritizes technicians with the highest skill proficiency for the ticket category
   - Considers certifications and past performance in similar categories

3. **Least Busy**
   - Assigns to the technician with the fewest active tickets
   - Simple and effective for even distribution

4. **Round Robin**
   - Rotates assignments evenly among available technicians
   - Ensures fair workload distribution over time

## Architecture

### Backend Structure
```
backend/auto_assignment_system/
├── __init__.py           # Package initialization
├── models.py             # Database models (5 tables)
├── schemas.py            # Pydantic schemas for API
├── routes.py             # FastAPI endpoints
├── service.py            # Core assignment logic
└── utils.py              # Helper functions
```

### Frontend Structure
```
frontend/src/auto_assignment_system/
└── AutoAssignmentConfig.jsx  # Configuration UI
```

### Database Tables

1. **assignment_rules**
   - Configurable rules for automatic assignment
   - Criteria matching (category, priority, location)
   - Strategy selection per rule

2. **technician_skills**
   - Skill proficiency levels (1-5)
   - Certifications
   - Performance metrics per skill

3. **technician_availability**
   - Current status (available, busy, on_leave, offline)
   - Working hours configuration
   - Active ticket count and capacity

4. **assignment_history**
   - Complete audit trail
   - Scoring breakdown for analytics
   - Outcome tracking

5. **auto_assignment_config**
   - Global system settings
   - Scoring weights
   - Notification preferences

## API Endpoints

### Configuration
- `GET /api/auto-assignment/config` - Get global configuration
- `PUT /api/auto-assignment/config` - Update configuration

### Rules
- `GET /api/auto-assignment/rules` - List all rules
- `POST /api/auto-assignment/rules` - Create new rule
- `GET /api/auto-assignment/rules/{id}` - Get specific rule
- `PUT /api/auto-assignment/rules/{id}` - Update rule
- `DELETE /api/auto-assignment/rules/{id}` - Delete rule

### Skills
- `GET /api/auto-assignment/skills` - List technician skills
- `POST /api/auto-assignment/skills` - Add skill to technician
- `PUT /api/auto-assignment/skills/{id}` - Update skill
- `DELETE /api/auto-assignment/skills/{id}` - Remove skill

### Availability
- `GET /api/auto-assignment/availability` - List all availability
- `GET /api/auto-assignment/availability/{user_id}` - Get specific availability
- `POST /api/auto-assignment/availability` - Create availability record
- `PUT /api/auto-assignment/availability/{user_id}` - Update availability

### Actions
- `POST /api/auto-assignment/assign` - Manually trigger assignment
- `GET /api/auto-assignment/history` - Get assignment history
- `POST /api/auto-assignment/analytics` - Get analytics report

## Usage

### 1. Initial Setup

**Enable Auto-Assignment:**
```python
# Via API
PUT /api/auto-assignment/config
{
    "is_enabled": true,
    "default_strategy": "balanced",
    "skill_weight": 40,
    "workload_weight": 30,
    "performance_weight": 20,
    "location_weight": 10
}
```

**Configure Technician Skills:**
```python
POST /api/auto-assignment/skills
{
    "user_id": 12,
    "skill_name": "Network",
    "proficiency_level": 5,
    "is_certified": true,
    "certification_name": "CCNA"
}
```

**Set Availability:**
```python
POST /api/auto-assignment/availability
{
    "user_id": 12,
    "status": "available",
    "max_capacity": 10,
    "is_field_tech": true,
    "working_hours": {
        "monday": {"start": "09:00", "end": "18:00"},
        "tuesday": {"start": "09:00", "end": "18:00"}
    }
}
```

### 2. Create Assignment Rules

```python
POST /api/auto-assignment/rules
{
    "name": "Critical Hardware Issues",
    "description": "Route critical hardware tickets to senior techs",
    "priority": 10,
    "criteria": {
        "category": "Hardware",
        "priority": "critical"
    },
    "strategy": "skill_match",
    "tech_pool": ["technician", "senior_technician"],
    "max_tickets_per_tech": 5
}
```

### 3. Integrate with Ticket Creation

**In your ticket creation endpoint:**
```python
from auto_assignment_system.utils import trigger_auto_assignment

# After creating ticket
db.add(new_ticket)
db.commit()
db.refresh(new_ticket)

# Trigger auto-assignment
assigned_to = trigger_auto_assignment(db, new_ticket.id)

if assigned_to:
    print(f"Ticket {new_ticket.id} assigned to technician {assigned_to}")
```

### 4. Update on Status Change

```python
from auto_assignment_system.utils import update_on_ticket_status_change

# When ticket status changes
update_on_ticket_status_change(db, ticket_id, new_status)
```

## Configuration UI

Access the configuration interface at:
```
http://localhost:5173/dashboard/auto-assignment
```

**Required Roles:** Admin or Manager

### Tabs:
1. **Global Configuration** - System-wide settings and scoring weights
2. **Assignment Rules** - Create and manage assignment rules
3. **Technician Skills** - Manage skills and proficiency levels
4. **Availability** - View and update technician availability

## Scoring Algorithm

The balanced strategy calculates a weighted score for each candidate:

```
Total Score = (Skill × 0.4) + (Workload × 0.3) + (Performance × 0.2) + (Location × 0.1)
```

### Skill Match Score (0-100)
- Exact skill match: 60-100 (based on proficiency 1-5)
- Certification bonus: +10 points
- General specialization match: 60
- No match: 30

### Workload Score (0-100)
```
Score = 100 - (active_tickets / max_capacity × 100)
```

### Performance Score (0-100)
```
Score = (avg_customer_rating / 5) × 100
```

### Location Score (0-100)
- Same location: 100
- Different/unknown: 50

## Analytics & Reporting

### Get Assignment Analytics
```python
POST /api/auto-assignment/analytics
{
    "start_date": "2026-01-01T00:00:00",
    "end_date": "2026-01-31T23:59:59",
    "technician_id": 12  # Optional
}
```

**Response:**
```json
{
    "total_assignments": 150,
    "auto_assignments": 135,
    "manual_assignments": 15,
    "avg_skill_match": 85.5,
    "avg_workload_score": 72.3,
    "avg_resolution_time": 4.2,
    "avg_customer_rating": 4.5,
    "strategy_breakdown": {
        "balanced": 100,
        "skill_match": 35
    },
    "top_performers": [...]
}
```

## Best Practices

### 1. Regular Skill Updates
- Update technician skills quarterly
- Add certifications as they're obtained
- Review proficiency levels after training

### 2. Capacity Management
- Set realistic `max_capacity` values (8-12 tickets)
- Adjust based on ticket complexity and technician experience
- Monitor workload distribution regularly

### 3. Rule Prioritization
- Higher priority numbers execute first
- Create specific rules for critical scenarios
- Use general rules as fallback

### 4. Working Hours
- Keep working hours up to date
- Set status to "on_leave" for vacations
- Update location for field technicians

### 5. Performance Monitoring
- Review assignment history weekly
- Check if auto-assignments are successful
- Adjust scoring weights based on outcomes

## Troubleshooting

### Issue: No technicians available
**Solution:** Check availability status and working hours

### Issue: Poor skill matching
**Solution:** Add more skills to technician profiles

### Issue: Uneven workload distribution
**Solution:** Increase workload_weight in config

### Issue: Fallback to manager too often
**Solution:** Review technician capacity limits and availability

## Future Enhancements

- [ ] Machine learning-based assignment improvement
- [ ] Predictive workload balancing
- [ ] Auto-skill detection from resolved tickets
- [ ] Integration with calendar systems
- [ ] Mobile notifications for assignments
- [ ] Team-based assignment pools
- [ ] Customer preference tracking

## Support

For issues or questions:
- Check assignment history for debugging
- Review system logs for errors
- Verify database migrations ran successfully

---

**Created:** January 7, 2026  
**Version:** 1.0.0  
**License:** MIT
