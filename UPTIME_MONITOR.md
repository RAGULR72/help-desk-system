# Setting Up Uptime Monitoring

To prevent your free Render instance from spinning down (sleeping) after 15 minutes of inactivity, you can use a free uptime monitoring service.

## Instructions using cron-job.org (Recommended)

1.  **Register:** Go to [cron-job.org](https://cron-job.org/en/) and create a free account.
2.  **Create Cronjob:** Click "Create cronjob".
3.  **Title:** Enter "Proserve Help Desk Keepalive".
4.  **URL:** Enter your backend health check URL:
    *   `https://help-desk-system-b5gy.onrender.com/health`
5.  **Execution Schedule:**
    *   Select "Every 14 minutes" (or set user-defined to `*/14 * * * *`).
    *   *Reason: Render free tier sleeps after 15 mins. Pinging every 14 mins prevents this.*
6.  **Create:** Save the job.

## Alternative: UptimeRobot

1.  Register at [uptimerobot.com](https://uptimerobot.com/).
2.  Click "Add New Monitor".
3.  Monitor Type: "HTTP(s)".
4.  Friendly Name: "Proserve Backend".
5.  URL: `https://help-desk-system-b5gy.onrender.com/health`.
6.  Monitoring Interval: 5 minutes (standard free tier).
7.  Create Monitor.

## Purpose

These services will send a simple HTTP request to your backend periodically. This traffic counts as "activity" and prevents Render from putting your app to sleep, ensuring faster response times when you use the app.
