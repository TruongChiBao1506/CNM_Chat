package iuh.fit.se.ChatApp.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

@Data
@Document(collection = "classifies")
public class Classify { // Dùng để phân loại/nhóm các cuộc hội thoại của một user
    @Id
    private String id;

    private String name;
    private List<String> conversationIds;
    private String colorId;
    private String userId;
}
