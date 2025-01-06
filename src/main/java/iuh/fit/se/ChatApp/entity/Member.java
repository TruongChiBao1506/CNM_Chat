package iuh.fit.se.ChatApp.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Date;
import java.util.List;

@Data
@Document(collection = "members")
public class Member {
    @Id
    private String id;

    private String conversationId; // ID của cuộc trò chuyện mà member tham gia
    private String userId;
    private Date lastView = new Date(); // Thời điểm cuối cùng member xem cuộc trò chuyện
    private String name;
    private List<ChannelLastView> lastViewOfChannels; // Danh sách lưu thời điểm xem cuối cùng của member trong từng channel
    private Boolean isNotify = true; // Trạng thái nhận thông báo của member, true: nhận, false: không nhận

    @Data
    public static class ChannelLastView {
        private String channelId;
        private Date lastView;
    }
}
