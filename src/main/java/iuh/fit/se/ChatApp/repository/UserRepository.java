package iuh.fit.se.ChatApp.repository;

import iuh.fit.se.ChatApp.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByUsernameAndIsActivedTrueAndIsDeletedFalse(String username);

    Optional<User> findByIdAndIsActivedTrue(String id);

    boolean existsByUsernameAndIsActivedTrue(String username);

    Optional<User> findByUsername(String username);
    Page<User> findByUsernameContaining(String username, Pageable pageable);
}
