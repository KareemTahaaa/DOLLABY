# Security Guidelines

Security considerations and best practices for Dollaby development and deployment.

## 🔐 Authentication & Authorization

### Password Security
- ✅ Passwords hashed with bcrypt (12 rounds minimum)
- ✅ Passwords never logged or stored in plaintext
- ✅ Password reset with secure token expiration
- ✅ Implement rate limiting on login endpoints

### JWT Tokens
- ✅ Use HS256 algorithm with strong secret key
- ✅ Set appropriate token expiration (15-60 minutes)
- ✅ Implement refresh token mechanism
- ✅ Store tokens securely (httpOnly cookies preferred over localStorage)
- ✅ Validate token signature on every request

### Session Management
- ✅ Invalidate tokens on logout
- ✅ Track active sessions per user
- ✅ Implement session timeout
- ✅ Support session revocation across devices

## 🛡️ API Security

### CORS Configuration
```python
# Only allow specific frontend origins
CORS_ORIGINS = ["https://yourdomain.com"]
# Not: ["*"]
```

### Rate Limiting
- Implement per-user rate limits
- Track and alert on unusual patterns
- Protect auth endpoints with stricter limits

### Input Validation
- ✅ Validate all user input with Pydantic
- ✅ Whitelist allowed values
- ✅ Reject excessively large payloads
- ✅ Sanitize file uploads

### HTTPS/TLS
- ✅ Enforce HTTPS in production
- ✅ Use valid SSL certificates (Let's Encrypt)
- ✅ Set secure headers (HSTS, CSP, X-Frame-Options)
- ✅ Redirect HTTP to HTTPS

## 🗄️ Database Security

### MongoDB Security
```python
# ✅ Use strong credentials
DATABASE_URL = "mongodb+srv://[strong-user]:[strong-pass]@..."

# ✅ Whitelist IP addresses (not 0.0.0.0/0 in production)
# MongoDB Atlas → Network Access → IP Whitelist

# ✅ Enable authentication
# MongoDB Atlas → Database Access → Create user with minimal permissions

# ✅ Encrypt connections (SSL/TLS enabled by default)
```

### Data Protection
- ✅ Encrypt sensitive data (API keys, tokens)
- ✅ Hash passwords before storage
- ✅ Implement field-level encryption for PII
- ✅ Use secrets management for API keys

## 🔑 Secret Management

### Environment Variables
```bash
# ✅ Never commit .env files
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore

# ✅ Use strong random values
python -c "import secrets; print(secrets.token_urlsafe(32))"

# ✅ Rotate secrets periodically
# Update JWT_SECRET_KEY, API keys monthly
```

### API Key Management
- Store in `.env` files (never in code)
- Use secrets management services (AWS Secrets Manager, HashiCorp Vault)
- Rotate API keys monthly
- Monitor API key usage
- Set appropriate permissions/scopes

## 🚨 Error Handling

### Don't Expose Sensitive Info
```python
# ❌ Bad - exposes internal details
raise HTTPException(status_code=500, detail=str(e))

# ✅ Good - generic error message
raise HTTPException(status_code=500, detail="Internal server error")

# Log actual error for debugging
logger.error(f"Database error: {e}")
```

### Logging
- Never log passwords, tokens, or API keys
- Log security events (failed logins, permission denied)
- Sanitize user input in logs
- Monitor logs for suspicious patterns

## 📤 File Upload Security

### Validation
```python
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB

def validate_upload(file: UploadFile):
    # ✅ Check file extension
    ext = file.filename.split(".")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError("Invalid file type")
    
    # ✅ Check file size
    if file.size > MAX_FILE_SIZE:
        raise ValueError("File too large")
    
    # ✅ Scan for malware
    # Use ClamAV or similar service
```

### Storage
- ✅ Store uploaded files outside web root
- ✅ Generate random filenames (don't use user input)
- ✅ Set appropriate file permissions
- ✅ Implement access control (only user can access their files)
- ✅ Compress images to reduce storage

## 🔍 Security Headers

### HTTP Security Headers
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
)

# Add to Nginx or FastAPI
headers = {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Content-Security-Policy": "default-src 'self'",
    "Referrer-Policy": "no-referrer-when-downgrade",
}
```

## 🔐 Dependency Security

### Vulnerability Scanning
```bash
# Check for known vulnerabilities
pip-audit

# Update dependencies regularly
pip list --outdated

# Use dependency version pinning
pip freeze > requirements.txt
```

### Trusted Dependencies
- Regularly audit third-party packages
- Pin major versions in requirements.txt
- Review changelogs before updating
- Monitor security advisories

## 🚨 Common Vulnerabilities (OWASP Top 10)

### 1. Broken Authentication
- ✅ Implement strong password policies
- ✅ Use secure session management
- ✅ Implement MFA for sensitive operations

### 2. Sensitive Data Exposure
- ✅ Encrypt data in transit (HTTPS)
- ✅ Encrypt data at rest
- ✅ Minimize logging of sensitive data

### 3. SQL Injection
- ✅ Use parameterized queries (MongoDB prevents this with proper drivers)
- ✅ Validate input types

### 4. Broken Access Control
- ✅ Verify user ownership of resources
- ✅ Implement role-based access control
- ✅ Check permissions on every endpoint

```python
# ✅ Good - verify user owns resource
async def delete_closet_item(item_id: str, current_user: User):
    item = await db.closet.find_one({"_id": ObjectId(item_id)})
    if item["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
```

### 5. Security Misconfiguration
- ✅ Disable debug mode in production
- ✅ Update frameworks and libraries
- ✅ Remove unnecessary services
- ✅ Use secure defaults

### 6. Cross-Site Scripting (XSS)
- ✅ Sanitize user input (Pydantic does this)
- ✅ Encode output in templates
- ✅ Use Content Security Policy headers

### 7. Cross-Site Request Forgery (CSRF)
- ✅ Use CSRF tokens for state-changing operations
- ✅ Validate Referer header
- ✅ Use SameSite cookie attribute

### 8. Insecure Deserialization
- ✅ Validate JSON schema
- ✅ Don't deserialize untrusted data directly
- ✅ Use Pydantic for validation

### 9. Using Components with Known Vulnerabilities
- ✅ Keep dependencies updated
- ✅ Monitor security advisories
- ✅ Use automated scanning

### 10. Insufficient Logging & Monitoring
- ✅ Log security events
- ✅ Monitor for suspicious activity
- ✅ Set up alerts for failures
- ✅ Centralize logs

## 🔄 Security Checklist

### Before Production Deployment
- [ ] All secrets in environment variables
- [ ] HTTPS/SSL enabled
- [ ] Database credentials strong and rotated
- [ ] API keys restricted to necessary scopes
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Security headers set
- [ ] Input validation in place
- [ ] Error messages non-informative
- [ ] Logging configured (no sensitive data)
- [ ] Database backups tested
- [ ] Firewall rules configured
- [ ] Dependencies audited
- [ ] Code reviewed for vulnerabilities

### Regular Security Maintenance
- [ ] Weekly: Check dependency updates
- [ ] Monthly: Rotate API keys and database credentials
- [ ] Quarterly: Security audit and penetration testing
- [ ] Annually: Full security assessment

## 📚 Resources

- [OWASP Top 10](https://owasp.org/Top10/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [MongoDB Security](https://docs.mongodb.com/manual/security/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

## 🚨 Security Incident Response

If you discover a security vulnerability:

1. **Don't** commit or push the fix publicly
2. **Do** report privately to maintainers
3. **Email**: security@yourdomain.com (if established)
4. **Wait** for acknowledgment before public disclosure
5. **Follow** responsible disclosure timeline (typically 90 days)

---

**Last Updated:** May 2026
