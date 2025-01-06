package iuh.fit.se.ChatApp.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Date;
import java.util.List;

@Data
@Document(collection = "messages")
public class Message {
    @Id
    private String id;

    private String userId;
    private List<String> manipulatedUserIds;
    private String content;
    private List<String> tags;
    private String replyMessageId;
    private MessageType type;
    private List<React> reacts;
    private List<Option> options;
    private List<String> deletedUserIds;
    private Boolean isDeleted = false;
    private String conversationId;
    private String channelId;

    public enum MessageType {
        TEXT, IMAGE, STICKER, VIDEO, FILE, HTML, NOTIFY, VOTE
    }

    @Data
    public static class React {
        private String userId;
        private Integer type; // 0-6
    }

    @Data
    public static class Option {
        private String name;
        private List<String> userIds;
    }
}
