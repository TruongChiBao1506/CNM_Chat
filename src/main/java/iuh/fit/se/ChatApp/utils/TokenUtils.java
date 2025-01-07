package iuh.fit.se.ChatApp.utils;

import io.jsonwebtoken.*;
import iuh.fit.se.ChatApp.exception.MyError;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@Slf4j
public class TokenUtils {

    @Value("${jwt.secret}")
    private String jwtSecret;

    /**
     * Generate JWT token từ data và thời gian sống của token
     * @param data Data để tạo token
     * @param tokenLife Thời gian sống của token (milliseconds)
     * @return JWT token hoặc null nếu data rỗng
     */
    public String generateToken(Map<String, Object> data, long tokenLife) {
        try {
            if (data == null || data.isEmpty()) {
                return null;
            }

            // Thêm thời gian tạo token vào claims
            data.put("createdAt", new Date());

            return Jwts.builder()
                    .setClaims(data)
                    .setIssuedAt(new Date())
                    .setExpiration(new Date(System.currentTimeMillis() + tokenLife))
                    .signWith(SignatureAlgorithm.HS512, jwtSecret)
                    .compact();

        } catch (Exception e) {
            log.error("Error generating token: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Verify JWT token và trả về claims
     * @param token JWT token cần verify
     * @return Claims từ token
     * @throws MyError nếu token invalid hoặc expired
     */
    public Claims verifyToken(String token) {
        try {
            if (StringUtils.isEmpty(token)) {
                throw new MyError("Token invalid");
            }

            return Jwts.parser()
                    .setSigningKey(jwtSecret)
                    .parseClaimsJws(token)
                    .getBody();

        } catch (ExpiredJwtException e) {
            log.error("JWT token expired: {}", e.getMessage());
            throw new MyError("Token expired");
        } catch (JwtException e) {
            log.error("JWT token verification failed: {}", e.getMessage());
            throw new MyError("Token invalid");
        }
    }

    /**
     * Generate token cho user authentication
     * @param userDetails UserDetails object chứa thông tin user
     * @param tokenLife Thời gian sống của token
     * @return JWT token
     */
    public String generateAuthToken(UserDetails userDetails, long tokenLife) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("username", userDetails.getUsername());
        claims.put("roles", userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList()));

        return generateToken(claims, tokenLife);
    }

    /**
     * Extract username từ token
     * @param token JWT token
     * @return Username
     */
    public String getUsernameFromToken(String token) {
        Claims claims = verifyToken(token);
        return claims.get("username", String.class);
    }

    /**
     * Validate token với UserDetails
     * @param token JWT token
     * @param userDetails UserDetails object để validate
     * @return true nếu token hợp lệ
     */
    public boolean validateToken(String token, UserDetails userDetails) {
        try {
            Claims claims = verifyToken(token);
            String username = claims.get("username", String.class);
            return username.equals(userDetails.getUsername()) &&
                    !isTokenExpired(claims.getExpiration());
        } catch (MyError e) {
            return false;
        }
    }

    /**
     * Kiểm tra token đã hết hạn chưa
     * @param expiration Thời gian hết hạn
     * @return true nếu token đã hết hạn
     */
    private boolean isTokenExpired(Date expiration) {
        return expiration.before(new Date());
    }
}
