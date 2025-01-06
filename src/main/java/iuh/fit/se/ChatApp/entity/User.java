package iuh.fit.se.ChatApp.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;
import java.util.Date;
import java.util.List;

@Data
@Document(collection = "users")
public class User {
    @Id
    private String id;

    private String name;

    @Indexed(unique = true)
    private String username;

    private String password;
    private String avatar;
    private String avatarColor = "white";
    private String coverImage;
    private Boolean type;
    private Date dateOfBirth = new Date("2000-01-01");
    private Boolean gender = false;

    private List<RefreshToken> refreshTokens;
    private List<PhoneBook> phoneBooks;

    private String otp;
    private Date otpTime;
    private Boolean isActived;
    private Boolean isDeleted = false;
    private Boolean isAdmin = false;
    private Date timeRevokeToken = new Date();

    @Data
    public static class RefreshToken {
        private String token;
        private String source;
    }

    @Data
    public static class PhoneBook {
        private String name;
        private String phone;
    }
}
