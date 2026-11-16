package org.example.trai.service;

import jakarta.annotation.Resource;
import org.example.trai.entity.DTO.ChapterAddDTO;
import org.example.trai.entity.DTO.ChapterDeleteDTO;
import org.example.trai.entity.DTO.ChapterGetDTO;
import org.example.trai.entity.DTO.ChapterUpdateDTO;
import org.example.trai.entity.PO.ChapterPO;
import org.example.trai.entity.VO.ChapterGetVO;
import org.example.trai.entity.VO.ChapterInfoVO;
import org.example.trai.mapper.BookMapper;
import org.example.trai.mapper.ChapterMapper;
import org.example.trai.mapper.UserChapterReadMapper;
import org.example.trai.mapper.UserCurrentReadMapper;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class ChapterService {
    @Resource
    private ChapterMapper chapterMapper;

    @Resource
    private BookMapper bookMapper;

    @Resource
    private UserCurrentReadMapper userCurrentReadMapper;

    @Resource
    private UserChapterReadMapper userChapterReadMapper;

    @Transactional(rollbackFor = Exception.class)
    public Boolean addChapter(ChapterAddDTO chapterAddDTO) {
        // 1. 获取nexSortId
        Integer nextSortId = chapterMapper.queryNextSortId(chapterAddDTO.getBookId());
        if (nextSortId == null) return false;

        // 2. 组装PO
        ChapterPO po = new ChapterPO();
        BeanUtils.copyProperties(chapterAddDTO, po);
        po.setSortId(nextSortId);

        // 3. 插入结果
        int res = chapterMapper.insertOneChapter(po);
        if (res != 1) throw new RuntimeException("新增章节失败");

        // 4. 更新book
        int update = bookMapper.updateAddChapterCount(chapterAddDTO.getBookId());
        if (update != 1) throw new RuntimeException("更新书籍章节数量失败");

        // 5. 返回结果
        return true;
    }

    @Transactional(rollbackFor = Exception.class)
    public Boolean deleteChapter(ChapterDeleteDTO dto) {
        // 1. 先取定位（此时 chapter 还是 state=0）
        ChapterPO chapter = chapterMapper.queryById(dto.getChapterId());
        if (chapter == null) throw new RuntimeException("章节不存在或已删除");

        // 2. 软删 + 章节数 -1 + 作废所有人的该章阅读记录
        if (chapterMapper.updateState(dto.getBookId(), dto.getChapterId()) != 1)
            throw new RuntimeException("删除章节失败");
        if (bookMapper.updateSubtractChapterCount(dto.getBookId()) != 1)
            throw new RuntimeException("删除章节失败");
        userChapterReadMapper.updateStateByChapterId(dto.getChapterId());

        // 3. 指针落在被删章上 → 回退到它前面最近的一章（单表查，无 join）
        ChapterPO prev = chapterMapper.queryPrevChapter(chapter.getBookId(), chapter.getSortId());
        userCurrentReadMapper.resetPointerByChapterId(
                dto.getChapterId(),
                prev != null ? prev.getId() : 0L,
                prev != null ? prev.getSortId() : 0);

        return true;
    }


    public List<ChapterGetVO> getChaptersByBookId(Long bookId) {
        List<ChapterPO> chapterPOS = chapterMapper.queryAllChapterByBookId(bookId, null, null);

        return chapterPOS.stream()
                .map(po -> {
                    ChapterGetVO vo = new ChapterGetVO();
                    BeanUtils.copyProperties(po, vo);
                    return vo;
                })
                .toList();
    }

    public ChapterInfoVO getChapterById(Long id) {
        ChapterPO chapterPO = chapterMapper.queryById(id);
        if (chapterPO == null) return null;


        ChapterInfoVO vo = new ChapterInfoVO();
        BeanUtils.copyProperties(chapterPO, vo);
        return vo;
    }

    public Boolean updateChapter(ChapterUpdateDTO chapterUpdateDTO) {
        ChapterPO po = new ChapterPO();
        BeanUtils.copyProperties(chapterUpdateDTO, po);

        int res = chapterMapper.updateChapter(po);
        return res == 1;
    }

    public List<ChapterGetVO> getChaptersByPageSizeAndBookId(ChapterGetDTO dto, Long userId) {
        List<ChapterPO> chapterPOS = chapterMapper.queryAllChapterByBookId(
                dto.getBookId(), dto.getLastSortId(), dto.getSize());
        if (chapterPOS == null || chapterPOS.isEmpty()) return Collections.emptyList();

        // 这本书已读完的章节 id：一次查询，内存标记（走 idx_user_book）
        Set<Long> readIds = new HashSet<>(
                userChapterReadMapper.queryReadChapterIds(userId, dto.getBookId()));

        List<ChapterGetVO> vos = new ArrayList<>(chapterPOS.size());
        for (ChapterPO po : chapterPOS) {
            ChapterGetVO vo = new ChapterGetVO();
            BeanUtils.copyProperties(po, vo);
            vo.setReadState(readIds.contains(po.getId()));
            vos.add(vo);
        }
        return vos;
    }

}
