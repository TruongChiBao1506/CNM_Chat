package iuh.fit.se.ChatApp.repository;

import iuh.fit.se.ChatApp.entity.FriendRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FriendRequestRepository extends MongoRepository<FriendRequest, String> {
    boolean existsByFromIdAndToId(String fromId, String toId);
}