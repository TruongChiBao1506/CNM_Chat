package iuh.fit.se.ChatApp.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserSummaryDTO {
    private String id;
    private String name;
    private String avatar;
    private String avatarColor;
}