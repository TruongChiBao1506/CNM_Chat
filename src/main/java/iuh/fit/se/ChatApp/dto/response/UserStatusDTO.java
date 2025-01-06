package iuh.fit.se.ChatApp.dto.response;

import iuh.fit.se.ChatApp.utils.DateUtils;
import lombok.Builder;
import lombok.Data;

import java.util.Date;

@Data
@Builder
public class UserStatusDTO extends UserDTO {
    private String id;
    private String name;
    private String username;
    private Date dateOfBirth;
    private Boolean gender;
    private String avatar;
    private String avatarColor;
    private String coverImage;
    private String status;
    private Long numberCommonGroup;
    private Integer numberCommonFriend;
}