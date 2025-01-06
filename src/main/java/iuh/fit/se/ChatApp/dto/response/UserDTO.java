package iuh.fit.se.ChatApp.dto.response;

import iuh.fit.se.ChatApp.entity.User;
import iuh.fit.se.ChatApp.utils.DateUtils;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class UserDTO {
    private String id;
    private String name;
    private String username;
    private DateUtils.DateObject dateOfBirth;
    private Boolean gender;
    private String avatar;
    private String avatarColor;
    private String coverImage;
    private Boolean isAdmin;
    private List<User.PhoneBook> phoneBooks;
}