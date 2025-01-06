package iuh.fit.se.ChatApp.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

@Data
@Document(collection = "stickers")
public class Sticker {
    @Id
    private String id;

    private String name;
    private String description = "";
    private List<String> stickers;
}