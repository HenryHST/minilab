---
title: Cron Jobs for DevOps
book_version: "1.0.0"
---

# Cron Jobs for DevOps Engineers

Let's look at 1x cron jobs to somewhat make life easier, complete with explanations and examples that you can adapt to your exact needs.

## 1. System Updates

Automatically update packages on a Linux system to keep it secure and up-to-date.

`0 3 * * 1 apt-get update && apt-get upgrade -y`

- Runs every Monday at 3 AM.
- Automates the process of applying system updates.


## 2. Database Backup
Create a daily backup of a MySQL database.

`0 4 * * * mysqldump -u root -pYourPassword
database_name › /path/to/backup/db_$(date +\%F`


- Runs daily at 4 AM.
- Dumps the database to a file named with the current date for easy referencing.


## 3. Log Rotation
Rotate logs weekly to prevent them from consuming excessive disk space.

`0 0 * * 0 logrotate /etc/logrotate.conf`
- Executes every Sunday at midnight.
- Utilizes the 'logrotate' tool to manage log files.

## 4. Disk Usage Alert
Send an email alert when disk usage exceeds a threshold.

`*/45 * * * * df -h
I awk '$5 > 85 {print}' | mail -s "Disk Usage Alert" you@example.co`
- Runs every 45 minutes.
- Checks the disk usage and sends an email alert if the usage exceeds 85%.

## 5. Clear Temp Files
Remove temporary files older than 7 days.

`0 1 * * * find /tmp -type f-mtime +7 -exec rm {} \;`
- Runs daily at 1 AM.
- Cleans up old temporary files to free up disk space.

## 6. Automated SSL Certificate Renewal
Renew SSL certificates using Certbot.

`0 0 1 * * certbot renew --quiet`
- Runs on the first day of every month at midnight.
- Automatically renews expiring SSL certificates.

## 7. Restart Web Server
Restart the web server weekly to ensure stability.

`O 4 * * O systemctl restart apache`
- Runs every Sunday at 4 AM.
- Restarts the Apache server to prevent memory leaks or other related issues.

## 8. Monitor Website Availability
Ping a website and log downtime

`*/5 * * * * curl-s -o /dev/null -w "%{http_code}" https://example.com
I grep -q "200`
- Runs every 5 minutes.
- Logs an entry if the website is unavailable.

## 9. Sync Files to Remote Server
Sync files to a backup server using rsync.
`0 1 * * * rsync -avz /local/directory/ user@remote:/ remote/directory`
- Runs daily at 1 AM.
- Ensures that local files are backed up to a remote server.

## 10. Check SSL Certificate Expiration
Check SSL certificate expiration and send a warning if it's about to expire.

`0 9 * * * /path/to/check_ssl.sh`
- Runs daily at 9 AM.
- The script sends alerts if certificates expire within 30 days.

## 11. Monitor Memory Usage
Log memory usage to a file for analysis.

`*/10 * * * * free -m >>
/path/to/log/memory.log`
- Runs every 10 minutes.
- Appends the memory usage statistics to a log file.

## 12. Automated Git Pull
Keep a repository up-to-date by pulling changes automatically.

`0 4 * * * cd /path/to/repo && git pull origin main`
- Runs daily at 4 AM.
- Pulls the latest changes from the Git repository.

## 13. Kubernetes Pod Health Check
Check the status of Kubernetes pods and log issues.

`*/5 * * * * kubectl get pods --all-namespaces › /path/to/log/k8s_pods.log`
- Runs every 5 minutes.
- Logs the status of all pods for troubleshooting.

## 14. Rotate Database Logs
Rotate database logs to avoid excessive file sizes.

`0 0 * * 0 mv /var/log/mysql.log /var/log/mysql_$(date +\%F).log && systemctl restart mysql`
- Runs weekly at midnight on Sunday.
- Renames and archives the MySQL log file, then restarts the service.


## 15. Monitor CPU Usage
Log CPU usage for performance monitoring.

`*/15 * * * * top -b -n 1 | grep "Cpu(s)" ›› /path/to/log/cpu.log`
- Runs every 15 minutes.
- Captures CPU usage statistics for performance analysis.

## 16. Uptime Monitoring
Log system uptime for tracking availability.

`0 * * * * uptime ›› /path/to/log/uptime.log`
- Runs hourly.
- Appends the system uptime to a log

## 17. Clear Cache
Clear system cache periodically.

`0 3 * * * sync; echo 3 › / proc/sys/vm/drop_caches`
- Runs daily at 3 AM.
- Frees up unused cached memory.

## 18. Check Open Ports
Log open network ports for security auditing.

`0 2 * * 7 netstat -tuln >› / path/to/log/open_ports.log`
- Runs weekly at 2 AM.
- Logs a snapshot of all open ports.

## 19. Delete Old Backups
Remove backup files older than 30 days to free up space.

`0 3 * * * find /path/to/backup/ -type f -mtime
+30 -exec rm {} \ ;`
- Runs daily at 3 AM.
- Deletes backup files older than 30 days to manage storage.
