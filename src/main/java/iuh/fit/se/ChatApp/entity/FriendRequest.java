package iuh.fit.se.ChatApp.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "friend_requests")
public class FriendRequest {
    @Id
    private String id;

    private String senderId; // ID người gửi lời mời kết bạn
    private String receiverId; // ID người nhận lời mời kết bạn
}