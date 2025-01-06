package iuh.fit.se.ChatApp.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

@Data
@Document(collection = "conversations")
public class Conversation {
    @Id
    private String id;

    private String name;
    private String avatar;
    private String leaderId;
    private List<String> managerIds;
    private String lastMessageId;
    private List<String> pinMessageIds;
    private List<String> members;
    private Boolean isJoinFromLink = true;
    private Boolean type;
}