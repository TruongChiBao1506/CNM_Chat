package iuh.fit.se.ChatApp.repository;

import iuh.fit.se.ChatApp.entity.Conversation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConversationRepository extends MongoRepository<Conversation, String> {
    long countByTypeAndMembersContainingAll(boolean type, List<String> memberIds);
}