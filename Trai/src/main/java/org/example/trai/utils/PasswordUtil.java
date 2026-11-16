package org.example.trai.utils;


import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;

/**
 * 密码工具 —— 只做两件事：存的时候 encode，验的时候 matches。
 * 明文永不落库、永不进日志。
 */
public final class PasswordUtil {

    /** 成本因子：10 ≈ 单次 100ms。不要低于 10，也不要为了快调到 4 */
    private static final int STRENGTH = 10;

    /** 线程安全，全局一个实例即可（内部无状态，每次 encode 自带随机盐） */
    private static final BCryptPasswordEncoder ENCODER = new BCryptPasswordEncoder(STRENGTH);

    /** BCrypt 只处理前 72 字节，超出部分被静默丢弃 —— 必须自己拦 */
    private static final int MAX_BYTES = 72;

    private static final SecureRandom RANDOM = new SecureRandom();

    private PasswordUtil() {}   // 纯静态工具类，禁止实例化

    /**
     * ① 明文 → 数据库里存的那 60 个字符
     * 建档：先 genInitialPassword() 生成，再 encode() 落库
     * 改密：用户输入新密码，直接 encode() 落库
     */
    public static String encode(String rawPassword) {
        checkRaw(rawPassword);
        return ENCODER.encode(rawPassword);
    }

    /**
     * ② 明文 + 库里存的串 → 密码是否正确
     * 登录时唯一入口，内部：拆出盐 → 同盐重算 → 常量时间比较
     */
    public static boolean matches(String rawPassword, String storedHash) {
        if (rawPassword == null || storedHash == null || storedHash.isBlank()) return false;
        if (rawPassword.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) return false;
        try {
            return ENCODER.matches(rawPassword, storedHash);
        } catch (IllegalArgumentException e) {
            return false;   // 库里不是合法 BCrypt 串（脏数据 / 被手改过）→ 当作不通过
        }
    }

    /**
     * ③（附带）生成 6 位初始密码，管理端「开账号 / 重置密码」用
     */
    public static String genInitialPassword() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }

    /** 明文长度校验：非空、≥6 字符、≤72 字节（中文 3 字节/字，约 24 个汉字上限） */
    public static void checkRaw(String raw) {
        if (raw == null || raw.isBlank()) throw new IllegalArgumentException("密码不能为空");
        if (raw.length() < 6)             throw new IllegalArgumentException("密码至少 6 位");
        if (raw.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES)
            throw new IllegalArgumentException("密码过长");
    }
}
