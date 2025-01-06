package iuh.fit.se.ChatApp.repository;

import iuh.fit.se.ChatApp.entity.Friend;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FriendRepository extends MongoRepository<Friend, String> {
    boolean existsByUserIds(String userId1, String userId2);

    @Query(value = "{'userIds': {$in: [?0]}}", fields = "{'userIds': 1, '_id': 0}")
    List<String> findFriendIdsExcludingUser(String userId);

    @Query(value = "{'userIds': {$all: [?0, ?1]}}", count = true)
    int countCommonFriends(List<String> friendIds, String myId);
}