package iuh.fit.se.ChatApp.service.impl;

import iuh.fit.se.ChatApp.dto.response.UserDTO;
import iuh.fit.se.ChatApp.dto.response.UserSummaryDTO;
import iuh.fit.se.ChatApp.entity.User;
import iuh.fit.se.ChatApp.exception.MyError;
import iuh.fit.se.ChatApp.exception.NotFoundError;
import iuh.fit.se.ChatApp.repository.UserRepository;
import iuh.fit.se.ChatApp.service.UserService;
import iuh.fit.se.ChatApp.utils.DateUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.List;

public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Autowired
    private DateUtils dateUtils;

    public UserServiceImpl(UserRepository userRepository, BCryptPasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public User saveUser(User user) {
        if (user.getPassword() != null) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        return userRepository.save(user);
    }

    @Override
    public User findByCredentials(String username, String password) {
        User user = userRepository.findByUsernameAndIsActivedTrueAndIsDeletedFalse(username)
                .orElseThrow(() -> new NotFoundError("User"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new MyError("Password invalid");
        }

        return user;
    }

    @Override
    public boolean existsById(String id) {
        return userRepository.findByIdAndIsActivedTrue(id).isPresent();
    }

    @Override
    public boolean existsByUsername(String username) {
        return userRepository.existsByUsernameAndIsActivedTrue(username);
    }

    @Override
    public UserDTO getById(String id, String message) {
        User user = userRepository.findByIdAndIsActivedTrue(id)
                .orElseThrow(() -> new NotFoundError(message));

        return UserDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .username(user.getUsername())
                .dateOfBirth(dateUtils.toObject(user.getDateOfBirth()))
                .gender(user.getGender())
                .avatar(user.getAvatar())
                .avatarColor(user.getAvatarColor())
                .coverImage(user.getCoverImage())
                .isAdmin(user.getIsAdmin())
                .phoneBooks(user.getPhoneBooks())
                .build();
    }


    @Override
    public void checkByIds(List<String> ids, String message) {
        for (String id : ids) {
            userRepository.findByIdAndIsActivedTrue(id)
                    .orElseThrow(() -> new NotFoundError(message));
        }
    }

    @Override
    public UserDTO findByUsername(String username, String message) {
        User user = userRepository.findByUsernameAndIsActivedTrueAndIsDeletedFalse(username)
                .orElseThrow(() -> new NotFoundError(message));

        return UserDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .username(username)
                .dateOfBirth(dateUtils.toObject(user.getDateOfBirth()))
                .gender(user.getGender())
                .avatar(user.getAvatar())
                .avatarColor(user.getAvatarColor())
                .coverImage(user.getCoverImage())
                .build();
    }

    @Override
    public User checkById(String id, String message) {
        return userRepository.findByIdAndIsActivedTrue(id)
                .orElseThrow(() -> new NotFoundError(message));
    }

    @Override
    public UserSummaryDTO getSummaryById(String id, String message) {
        User user = userRepository.findByIdAndIsActivedTrue(id)
                .orElseThrow(() -> new NotFoundError(message));

        return UserSummaryDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .avatar(user.getAvatar())
                .avatarColor(user.getAvatarColor())
                .build();
    }
}
