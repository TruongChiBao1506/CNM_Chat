package iuh.fit.se.ChatApp.repository;

import iuh.fit.se.ChatApp.entity.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByUsernameAndIsActivedTrueAndIsDeletedFalse(String username);

    Optional<User> findByIdAndIsActivedTrue(String id);

    boolean existsByUsernameAndIsActivedTrue(String username);
}
