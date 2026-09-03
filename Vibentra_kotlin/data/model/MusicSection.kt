package com.srivatsan.vibentra.data.model

data class MusicSection(
    val id: String,
    val title: String,
    val subtitlePrefix: String = "SIMILAR TO",
    val artistAvatarUrl: String? = null,
    val isArtistSimilar: Boolean = true,
    val songs: List<Song>
)
